// GIF Converter - slice mode: find the frames on a sprite sheet, fix the boxes by hand,
// then cut them into an animation that the other modes treat like any decomposed GIF

const SHEET_HINT_MIN = 4;  // a still image with this many detected frames looks like a sprite sheet
const MIN_PANEL_SIZE = 2;  // px on the sheet; smaller boxes are treated as a stray click

const centerY = (p) => p.y + p.h / 2;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

async function detectPanels(image) {
  const res = await postJson('/api/detect-panels', { image });
  if (!res.ok) throw new Error((await requestError(res, '偵測影格失敗')).message);
  return (await res.json()).panels;
}

// Runs in the background after a still image opens, so the Remove panel can suggest slicing
async function guessSheet() {
  try {
    state.sheetGuess = await detectPanels(state.frames[0].image);
  } catch {
    state.sheetGuess = [];
  }
  if (state.mode === 'remove') renderInspector();
}

// Group boxes into rows by their vertical centre; the tolerance copes with rows of uneven height
function groupRows(panels) {
  if (!panels.length) return [];
  const heights = panels.map(p => p.h).sort((a, b) => a - b);
  const tolerance = heights[Math.floor(heights.length / 2)] * 0.35;
  const rows = [];
  [...panels].sort((a, b) => centerY(a) - centerY(b)).forEach(p => {
    const row = rows[rows.length - 1];
    if (row && centerY(p) - row.center <= tolerance) {
      row.items.push(p);
      row.center = row.items.reduce((sum, q) => sum + centerY(q), 0) / row.items.length;
    } else {
      rows.push({ center: centerY(p), items: [p] });
    }
  });
  return rows.map(r => r.items.sort((a, b) => a.x - b.x));
}

const sortPanels = (panels) => groupRows(panels).flat();

// A box remembers where it stood when adjustments were last shared, so one box's hand
// adjustment since then can be repeated on the others
const withOrigin = (p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, origin: { x: p.x, y: p.y, w: p.w, h: p.h } });

function gridPanels({ width, height, rows, cols }) {
  const panels = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.round(c * width / cols);
      const y = Math.round(r * height / rows);
      panels.push({ x, y, w: Math.round((c + 1) * width / cols) - x, h: Math.round((r + 1) * height / rows) - y });
    }
  }
  return panels;
}

function renderSheetOffer() {
  const guess = state.sheetGuess;
  $('sheet-offer-text').textContent = guess === null
    ? '正在檢查這張圖是不是 Sprite Sheet…'
    : guess.length >= SHEET_HINT_MIN
      ? `偵測到 ${guess.length} 格，看起來是 Sprite Sheet。可以切成逐幀動畫直接導出 GIF，或切完再逐幀去背。`
      : '如果這是 Sprite Sheet，可以切成逐幀動畫再導出 GIF。';
  $('btn-enter-slice').disabled = guess === null || state.removal.running;
}

function enterSlice() {
  const frame = state.frames[0];
  const detected = sortPanels(state.sheetGuess || []);
  const rows = groupRows(detected);
  state.sheet = {
    image: frame.image,
    width: frame.width,
    height: frame.height,
    method: 'auto',
    detected,
    panels: detected.map(withOrigin),
    rows: Math.max(1, rows.length),
    cols: Math.max(1, ...rows.map(r => r.length)),
    selected: null,
    draft: null,   // box being drawn, not yet part of panels
    scale: 1       // display px per sheet px, set on render
  };
  $('slice-rows').value = state.sheet.rows;
  $('slice-cols').value = state.sheet.cols;
  state.sliceError = '';
  setMode('slice');
}

// ---------- Rendering ----------

function renderSliceView() {
  const sheet = state.sheet;
  const img = $('slice-img');
  if (img.getAttribute('src') !== sheet.image) img.src = sheet.image;

  const scroll = $('slice-scroll');
  if (state.sliceZoom === 'fit') {
    const pad = getComputedStyle(scroll);
    const availW = Math.max(scroll.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight), 64);
    const availH = Math.max(scroll.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom), 64);
    sheet.scale = Math.min(availW / sheet.width, availH / sheet.height);
  } else {
    sheet.scale = Number(state.sliceZoom);
  }
  img.style.width = `${Math.max(1, Math.round(sheet.width * sheet.scale))}px`;
  img.style.height = `${Math.max(1, Math.round(sheet.height * sheet.scale))}px`;
  $('slice-box').classList.toggle('is-pixelated', sheet.scale >= 2);

  $('slice-zoom').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.zoom === String(state.sliceZoom));
  });

  setChips($('slice-chips'), [
    { text: `${sheet.panels.length} 格`, mono: true, tone: 'accent' },
    { text: sheet.method === 'grid' ? `規則網格 ${sheet.rows} × ${sheet.cols}` : '自動偵測', tone: 'muted' }
  ]);
  renderSliceBoxes();
}

function renderSliceBoxes() {
  const sheet = state.sheet;
  const s = sheet.scale;
  const boxes = sheet.panels.map((p, pos) => {
    const el = document.createElement('div');
    const selected = p === sheet.selected;
    el.className = `slice-rect${selected ? ' is-selected' : ''}`;
    el.dataset.pos = pos;
    el.innerHTML = `<span class="slice-label">${pad2(pos)}</span>`
      + (selected ? ['nw', 'ne', 'sw', 'se'].map(h => `<span class="slice-handle" data-handle="${h}"></span>`).join('') : '');
    return [el, p];
  });
  if (sheet.draft) {
    const el = document.createElement('div');
    el.className = 'slice-rect is-draft';
    boxes.push([el, sheet.draft]);
  }
  boxes.forEach(([el, p]) => {
    el.style.left = `${p.x * s}px`;
    el.style.top = `${p.y * s}px`;
    el.style.width = `${p.w * s}px`;
    el.style.height = `${p.h * s}px`;
  });
  $('slice-layer').replaceChildren(...boxes.map(([el]) => el));
}

function renderSlicePanel() {
  const sheet = state.sheet;
  const count = sheet.panels.length;

  $('slice-method').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.method === sheet.method);
  });
  $('slice-auto-opts').hidden = sheet.method !== 'auto';
  $('slice-grid-opts').hidden = sheet.method !== 'grid';
  $('slice-auto-hint').textContent = sheet.detected.length
    ? `偵測到 ${sheet.detected.length} 格。框不對可以直接在圖上修正。`
    : '沒有偵測到影格。可以改用規則網格，或直接在圖上拖曳框選。';

  $('slice-summary').innerHTML = `共 <span class="mono accent">${count}</span> 格`;
  const selected = sheet.selected;
  $('slice-selected').hidden = !selected;
  if (selected) {
    $('slice-sel-no').textContent = `#${pad2(sheet.panels.indexOf(selected))}`;
    $('slice-sel-pos').textContent = `${selected.x}, ${selected.y}`;
    $('slice-sel-size').textContent = `${selected.w} × ${selected.h}`;

    const shift = edgeShift(selected);
    const moved = Object.entries({ 上: -shift.top, 下: shift.bottom, 左: -shift.left, 右: shift.right })
      .filter(([, v]) => v)
      .map(([edge, v]) => `${edge}邊${v > 0 ? '外擴' : '內縮'} ${Math.abs(v)}`);
    const others = count - 1;
    $('btn-slice-apply-all').textContent = `把這格的調整套用到其他 ${others} 格`;
    $('btn-slice-apply-all').disabled = !moved.length || others === 0;
    $('slice-shift-hint').textContent = moved.length
      ? `這格剛調整了${moved.join('、')} px。套用後其他格會從目前的位置調整同樣的距離，已經手動修好的格子也會保留修正。`
      : '調整這格的邊界後，可以把同樣的調整套用到其他格，例如一次裁掉每格底下的編號。';
  }

  const resliced = !state.file.isStatic;
  const btn = $('btn-slice');
  btn.disabled = state.slicing || count === 0;
  btn.innerHTML = state.slicing ? `${ICONS.spin} 正在切割…`
    : count === 0 ? '請先框出至少 1 格'
    : `${resliced ? '重新切割' : '切割'}成 ${count} 幀，前往導出 ${ICONS.arrow}`;
  $('btn-slice-align').disabled = btn.disabled;

  const note = $('slice-note');
  note.hidden = !state.sliceError;
  note.className = 'footer-note is-error';
  note.textContent = state.sliceError ? `切割失敗：${state.sliceError}` : '';
}

// ---------- Editing ----------

function setSliceMethod(method) {
  const sheet = state.sheet;
  sheet.method = method;
  sheet.panels = (method === 'grid' ? gridPanels(sheet) : sheet.detected).map(withOrigin);
  sheet.selected = null;
  renderStage();
  renderInspector();
}

// How far each edge of a box has been moved by hand since its origin
function edgeShift(p) {
  const o = p.origin;
  return { left: p.x - o.x, top: p.y - o.y, right: p.x + p.w - o.x - o.w, bottom: p.y + p.h - o.y - o.h };
}

// Repeat the selected box's edge adjustment on every other box, e.g. trim the same
// caption strip off the bottom of each frame even when frames differ in size. Each box
// moves from where it is now, so boxes already fixed by hand keep their fix.
function applyShiftToOthers() {
  const sheet = state.sheet;
  const shift = edgeShift(sheet.selected);
  sheet.panels.forEach(p => {
    if (p === sheet.selected) return;
    const x0 = clamp(p.x + shift.left, 0, sheet.width);
    const y0 = clamp(p.y + shift.top, 0, sheet.height);
    const x1 = clamp(p.x + p.w + shift.right, 0, sheet.width);
    const y1 = clamp(p.y + p.h + shift.bottom, 0, sheet.height);
    if (x1 - x0 >= MIN_PANEL_SIZE && y1 - y0 >= MIN_PANEL_SIZE) Object.assign(p, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  });
  // The adjustment has been shared; every box counts its next adjustment from here
  sheet.panels.forEach(p => { p.origin = { x: p.x, y: p.y, w: p.w, h: p.h }; });
  sheet.panels = sortPanels(sheet.panels);
  renderStage();
  renderInspector();
}

function deleteSelectedPanel() {
  const sheet = state.sheet;
  if (!sheet || !sheet.selected) return;
  sheet.panels = sheet.panels.filter(p => p !== sheet.selected);
  sheet.selected = null;
  renderStage();
  renderInspector();
}

// Move keeps the size; resize and draw move one corner while the opposite one stays put
function applyDrag(drag, pt) {
  const { width: W, height: H } = state.sheet;
  const { panel: p, orig: o, start } = drag;
  const dx = pt.x - start.x;
  const dy = pt.y - start.y;

  if (drag.kind === 'move') {
    p.x = Math.round(clamp(o.x + dx, 0, W - o.w));
    p.y = Math.round(clamp(o.y + dy, 0, H - o.h));
    return;
  }

  let x0, y0, x1, y1;
  if (drag.kind === 'draw') {
    [x0, y0, x1, y1] = [start.x, start.y, pt.x, pt.y];
  } else {
    [x0, y0, x1, y1] = [o.x, o.y, o.x + o.w, o.y + o.h];
    if (drag.handle.includes('w')) x0 += dx; else x1 += dx;
    if (drag.handle.includes('n')) y0 += dy; else y1 += dy;
  }
  [x0, x1] = [clamp(x0, 0, W), clamp(x1, 0, W)];
  [y0, y1] = [clamp(y0, 0, H), clamp(y1, 0, H)];
  p.x = Math.round(Math.min(x0, x1));
  p.y = Math.round(Math.min(y0, y1));
  p.w = Math.round(Math.abs(x1 - x0));
  p.h = Math.round(Math.abs(y1 - y0));
}

function initSliceEditing() {
  const layer = $('slice-layer');
  let drag = null;

  const toSheet = (e) => {
    const rect = layer.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / state.sheet.scale, y: (e.clientY - rect.top) / state.sheet.scale };
  };

  layer.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || state.slicing) return;
    e.preventDefault();
    const sheet = state.sheet;
    const start = toSheet(e);
    const rectEl = e.target.closest('.slice-rect');
    if (rectEl) {
      const panel = sheet.panels[Number(rectEl.dataset.pos)];
      const handle = e.target.closest('.slice-handle');
      sheet.selected = panel;
      drag = { kind: handle ? 'resize' : 'move', handle: handle && handle.dataset.handle, panel, orig: { ...panel }, start };
    } else {
      sheet.selected = null;
      sheet.draft = { x: Math.round(start.x), y: Math.round(start.y), w: 0, h: 0 };
      drag = { kind: 'draw', panel: sheet.draft, orig: null, start };
    }
    layer.setPointerCapture(e.pointerId);
    renderSliceBoxes();
    renderInspector();
  });

  layer.addEventListener('pointermove', (e) => {
    if (!drag) return;
    applyDrag(drag, toSheet(e));
    renderSliceBoxes();
  });

  const endDrag = () => {
    if (!drag) return;
    const sheet = state.sheet;
    const p = drag.panel;
    const tooSmall = p.w < MIN_PANEL_SIZE || p.h < MIN_PANEL_SIZE;
    if (drag.kind === 'draw') {
      sheet.draft = null;
      if (!tooSmall) {
        sheet.selected = withOrigin(p);
        sheet.panels.push(sheet.selected);
      }
    } else if (tooSmall) {
      Object.assign(p, drag.orig);
    }
    drag = null;
    sheet.panels = sortPanels(sheet.panels);
    renderStage();
    renderInspector();
  };
  layer.addEventListener('pointerup', endDrag);
  layer.addEventListener('pointercancel', endDrag);
}

// ---------- Slicing ----------

// next: the mode to open once the frames are cut ('export' or 'align')
async function runSlice(next) {
  const sheet = state.sheet;
  if (state.slicing || !sheet.panels.length) return;

  const removedCount = state.file.isStatic ? 0 : state.frames.filter(f => f.removed).length;
  if (removedCount && !confirm(`重新切割會取代目前的 ${state.frames.length} 幀，其中 ${removedCount} 幀的去背結果會一併清除。確定要繼續嗎？`)) return;

  const fps = clamp(parseFloat($('slice-fps').value) || 8, 1, 60);
  state.slicing = true;
  state.sliceError = '';
  renderSlicePanel();

  try {
    const res = await postJson('/api/slice-sheet', {
      image: sheet.image,
      panels: sheet.panels.map(({ x, y, w, h }) => ({ x, y, w, h })),
      duration: Math.round(1000 / fps)
    });
    if (!res.ok) throw new Error((await requestError(res, '切割失敗')).message);
    const data = await res.json();

    stopPlayback();
    state.frames = createFrames(data.frames);
    Object.assign(state.file, { width: data.width, height: data.height, isStatic: false });
    state.current = 0;
    buildTimeline();
    setMode(next);
  } catch (err) {
    state.sliceError = err.message;
  } finally {
    state.slicing = false;
    renderAll();
  }
}

function initSlicePanel() {
  $('btn-enter-slice').addEventListener('click', enterSlice);

  $('slice-method').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-method]');
    if (btn && btn.dataset.method !== state.sheet.method) setSliceMethod(btn.dataset.method);
  });
  $('btn-slice-reset').addEventListener('click', () => setSliceMethod('auto'));

  ['slice-rows', 'slice-cols'].forEach(id => {
    $(id).addEventListener('input', () => {
      const sheet = state.sheet;
      sheet.rows = clamp(parseInt($('slice-rows').value) || 1, 1, 50);
      sheet.cols = clamp(parseInt($('slice-cols').value) || 1, 1, 50);
      setSliceMethod('grid');
    });
  });

  $('slice-zoom').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-zoom]');
    if (!btn) return;
    state.sliceZoom = btn.dataset.zoom === 'fit' ? 'fit' : Number(btn.dataset.zoom);
    renderStage();
  });

  $('btn-slice-delete').addEventListener('click', deleteSelectedPanel);
  $('btn-slice-apply-all').addEventListener('click', applyShiftToOthers);
  $('btn-slice').addEventListener('click', () => runSlice('export'));
  $('btn-slice-align').addEventListener('click', () => runSlice('align'));
  initSliceEditing();
}
