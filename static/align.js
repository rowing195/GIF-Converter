// GIF Converter - align mode: keep the character steady across frames. Each frame's
// content box is scaled toward the reference frame (within a limit) and its anchor point
// is placed on one shared spot of a canvas that fits every frame.

const ANCHORS = {
  bottom: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h }),
  center: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }),
  top: (b) => ({ x: b.x + b.w / 2, y: b.y })
};

const loadedImages = new Map();  // data URL -> decoded <img>, so frames can be drawn synchronously
let bakeTimer = null;
let dragLayout = null;           // layout frozen while a frame is dragged, so the canvas holds still
let alignDisplayScale = 1;       // display px per canvas px, set on render

function defaultAlignSettings() {
  return { enabled: true, ref: null, scaleBy: 'height', maxChange: 5, anchor: 'bottom', padding: 8, onion: true, zoom: 'fit', busy: false, error: '' };
}

function loadImage(src) {
  if (loadedImages.has(src)) return Promise.resolve(loadedImages.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { loadedImages.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error('影格圖片無法讀取'));
    img.src = src;
  });
}

const alignReady = () => !state.align.busy && state.frames.every(f => f.box && f.boxFrom === sourceImage(f));

function refFrame() {
  const align = state.align;
  if (!state.frames.includes(align.ref)) align.ref = keptFrames()[0] || state.frames[0];
  return align.ref;
}

function placement(frame, ref) {
  const { scaleBy, maxChange, anchor } = state.align;
  const dim = scaleBy === 'width' ? 'w' : 'h';
  const auto = clamp(ref.box[dim] / frame.box[dim], 1 - maxChange / 100, 1 + maxChange / 100);
  const s = auto * frame.zoom;
  const b = frame.box;
  const a = ANCHORS[anchor](b);
  return { auto, s, left: (b.x - a.x) * s + frame.dx, top: (b.y - a.y) * s + frame.dy, w: b.w * s, h: b.h * s };
}

// One canvas for every frame (kept or not, so toggling frames never resizes the output)
function computeLayout() {
  const ref = refFrame();
  const places = new Map(state.frames.map(f => [f, placement(f, ref)]));
  const all = [...places.values()];
  const minL = Math.min(...all.map(p => p.left));
  const minT = Math.min(...all.map(p => p.top));
  const maxR = Math.max(...all.map(p => p.left + p.w));
  const maxB = Math.max(...all.map(p => p.top + p.h));
  const pad = state.align.padding;
  return {
    width: Math.ceil(maxR - minL) + 2 * pad,
    height: Math.ceil(maxB - minT) + 2 * pad,
    anchor: { x: pad - minL, y: pad - minT },
    places
  };
}

function frameRect(frame, layout) {
  const p = layout.places.get(frame);
  return {
    x: Math.round(layout.anchor.x + p.left),
    y: Math.round(layout.anchor.y + p.top),
    w: Math.max(1, Math.round(p.w)),
    h: Math.max(1, Math.round(p.h))
  };
}

// Opaque frames get a background colour around the character (null keeps it transparent)
function paintBackground(ctx, layout, bg = refFrame().background) {
  if (!bg) return;
  ctx.fillStyle = `rgb(${bg.join(',')})`;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

// src: which image of the frame to draw; the placement is the same for all of them
function paintFrame(ctx, frame, layout, alpha = 1, src = sourceImage(frame)) {
  const img = loadedImages.get(src);
  if (!img) return;
  const b = frame.box;
  const r = frameRect(frame, layout);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingQuality = 'high';
  if (frame.flip) {
    // Mirror within the frame's own box; every anchor sits on the box's centre line, so it stays put
    ctx.translate(r.x * 2 + r.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, b.x, b.y, b.w, b.h, r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Render every frame at its aligned position; export and the timeline use these images
function bakeAligned() {
  clearTimeout(bakeTimer);
  const layout = computeLayout();
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  const render = (frame, src, bg) => {
    ctx.clearRect(0, 0, layout.width, layout.height);
    paintBackground(ctx, layout, bg);
    paintFrame(ctx, frame, layout, 1, src);
    return canvas.toDataURL('image/png');
  };
  state.frames.forEach(frame => {
    frame.aligned = { image: render(frame, sourceImage(frame), refFrame().background), width: layout.width, height: layout.height, from: sourceImage(frame) };
    // Exports can ask for the frame without background removal, aligned the same way
    if (frame.removed) frame.aligned.original = render(frame, frame.image, frame.imageBackground);
  });
}

function scheduleBake() {
  clearTimeout(bakeTimer);
  bakeTimer = setTimeout(() => {
    bakeAligned();
    updateTimeline();
  }, 150);
}

// ---------- Undo / redo ----------

// Hand edits and settings, but not the on/off switch; frames are stored by position, so the
// history only lives as long as the current frame list (re-slicing starts a fresh one)
const history = { frames: null, undo: [], redo: [], committed: null };

function alignSnapshot() {
  const { scaleBy, maxChange, anchor, padding } = state.align;
  return JSON.stringify({
    settings: { scaleBy, maxChange, anchor, padding, ref: state.frames.indexOf(refFrame()) },
    frames: state.frames.map(f => [f.dx, f.dy, f.zoom, f.flip])
  });
}

function syncHistory() {
  if (history.frames === state.frames) return;
  Object.assign(history, { frames: state.frames, undo: [], redo: [], committed: alignSnapshot() });
}

// Call once an edit is finished (drag released, slider let go, key pressed)
function commitAlign() {
  syncHistory();
  const now = alignSnapshot();
  if (now === history.committed) return;
  history.undo.push(history.committed);
  history.redo = [];
  history.committed = now;
}

function restoreAlign(snapshot) {
  const { settings, frames } = JSON.parse(snapshot);
  const { ref, ...rest } = settings;
  Object.assign(state.align, rest, { ref: state.frames[ref] });
  state.frames.forEach((f, i) => { [f.dx, f.dy, f.zoom, f.flip] = frames[i]; });
  history.committed = snapshot;
  renderStage();
  renderInspector();
  scheduleBake();
}

function undoAlign() {
  commitAlign();
  if (!history.undo.length) return;
  history.redo.push(history.committed);
  restoreAlign(history.undo.pop());
}

function redoAlign() {
  commitAlign();
  if (!history.redo.length) return;
  history.undo.push(history.committed);
  restoreAlign(history.redo.pop());
}

// Find the content box of every frame whose image changed, then re-render them all
async function refreshAlignment() {
  const align = state.align;
  if (align.busy) return;
  align.busy = true;
  align.error = '';
  renderAll();

  try {
    const stale = state.frames.filter(f => f.boxFrom !== sourceImage(f));
    // Background-removed frames also need their original background, for exports without removal
    const noOriginalBg = state.frames.filter(f => f.removed && f.imageBackground === undefined);
    if (stale.length || noOriginalBg.length) {
      const images = stale.map(sourceImage);
      const res = await postJson('/api/content-boxes', { images: [...images, ...noOriginalBg.map(f => f.image)] });
      if (!res.ok) throw new Error((await requestError(res, '找不到角色位置')).message);
      const { frames } = await res.json();
      stale.forEach((f, i) => Object.assign(f, { box: frames[i].box, background: frames[i].background, boxFrom: images[i] }));
      noOriginalBg.forEach((f, i) => { f.imageBackground = frames[stale.length + i].background; });
    }

    const sources = new Set(state.frames.flatMap(f => (f.removed ? [f.removed, f.image] : [f.image])));
    for (const src of loadedImages.keys()) if (!sources.has(src)) loadedImages.delete(src);
    await Promise.all([...sources].map(loadImage));
    bakeAligned();
    syncHistory();
  } catch (err) {
    align.error = err.message;
  } finally {
    align.busy = false;
    renderAll();
  }
}

// The frame before this one in playback order, so onion skin also works on the first frame of a loop
function onionFrame(frame) {
  const kept = keptFrames();
  const pos = state.frames.indexOf(frame);
  const before = state.frames.slice(0, pos).reverse().find(f => f.keep);
  const prev = before || kept[kept.length - 1];
  return prev === frame ? null : prev;
}

// ---------- Rendering ----------

function renderAlignView() {
  const align = state.align;
  const frame = currentFrame();

  $('align-zoom').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.zoom === String(align.zoom));
  });
  $('align-onion').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', (btn.dataset.onion === 'on') === align.onion);
  });

  const ready = alignReady();
  $('align-box').hidden = !ready;
  if (!ready) {
    setChips($('align-chips'), [align.error
      ? { text: `對齊失敗：${align.error}`, tone: 'danger' }
      : { text: '正在找出每一幀的角色位置…', tone: 'muted' }]);
    return;
  }

  const layout = dragLayout || computeLayout();
  const canvas = $('align-canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, layout);
  paintFrame(ctx, frame, layout);
  const prev = align.onion ? onionFrame(frame) : null;
  if (prev) paintFrame(ctx, prev, layout, 0.35);

  const scroll = $('align-scroll');
  if (align.zoom === 'fit') {
    const pad = getComputedStyle(scroll);
    const availW = Math.max(scroll.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight), 64);
    const availH = Math.max(scroll.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom), 64);
    alignDisplayScale = Math.min(availW / layout.width, availH / layout.height);
  } else {
    alignDisplayScale = align.zoom;
  }
  const s = alignDisplayScale;
  canvas.style.width = `${Math.round(layout.width * s)}px`;
  canvas.style.height = `${Math.round(layout.height * s)}px`;
  $('align-box').classList.toggle('is-pixelated', s >= 2);

  // Guides through the shared anchor point, and this frame's content box
  $('align-guide-h').style.top = `${layout.anchor.y * s}px`;
  $('align-guide-v').style.left = `${layout.anchor.x * s}px`;
  const r = frameRect(frame, layout);
  Object.assign($('align-content').style, { left: `${r.x * s}px`, top: `${r.y * s}px`, width: `${r.w * s}px`, height: `${r.h * s}px` });

  const chips = [{ text: frameLabel(frame), mono: true, tone: 'accent' }];
  if (frame === refFrame()) chips.push({ text: '參考幀' });
  if (prev) chips.push({ text: `洋蔥皮：${frameLabel(prev)}`, tone: 'muted' });
  setChips($('align-chips'), chips);
}

function renderAlignPanel() {
  const align = state.align;
  const frame = currentFrame();
  const ready = alignReady();

  $('align-enabled').checked = align.enabled;
  $('align-settings').disabled = !align.enabled || !ready;
  $('align-status').textContent = align.error ? `對齊失敗：${align.error}`
    : !ready ? '正在找出每一幀的角色位置…'
    : align.enabled ? '導出、時間軸和導出預覽都會使用對齊後的影格。'
    : '已關閉，導出時使用切割時的原樣。';

  $('align-anchor').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.anchor === align.anchor);
  });
  $('align-scale-by').value = align.scaleBy;
  $('align-max').value = align.maxChange;
  $('align-max-val').textContent = `±${align.maxChange}%`;
  $('align-frame-label').textContent = `目前這一幀 · ${frameLabel(frame)}`;

  if (ready) {
    const ref = refFrame();
    const layout = dragLayout || computeLayout();
    const p = layout.places.get(frame);
    $('align-ref').textContent = frameLabel(ref);
    $('btn-align-set-ref').disabled = frame === ref;
    $('align-size').textContent = `${layout.width} × ${layout.height}`;
    $('align-frame-scale').textContent = `× ${p.auto.toFixed(3)}`;
    setFieldValue($('align-dx'), frame.dx);
    setFieldValue($('align-dy'), frame.dy);
    setFieldValue($('align-padding'), align.padding);
    $('align-frame-zoom').value = Math.round(frame.zoom * 100);
    $('align-zoom-val').textContent = `${Math.round(frame.zoom * 100)}%`;
    $('align-flip').checked = frame.flip;
    $('btn-align-reset-frame').disabled = !frame.dx && !frame.dy && frame.zoom === 1 && !frame.flip;
  }

  syncHistory();
  $('btn-align-undo').disabled = !ready || !history.undo.length;
  $('btn-align-redo').disabled = !ready || !history.redo.length;

  const next = $('btn-align-next');
  next.disabled = keptFrames().length === 0;
  next.innerHTML = `下一步：導出 ${ICONS.arrow}`;
}

// Leave a field alone while it is being typed in, so re-rendering never fights the cursor
function setFieldValue(el, value) {
  if (document.activeElement !== el) el.value = value;
}

// ---------- Editing ----------

// commit: the edit is finished and becomes an undo step; live slider and typing updates pass false
function updateAlignSettings(changes, commit = true) {
  Object.assign(state.align, changes);
  if (commit) commitAlign();
  renderStage();
  renderInspector();
  if (state.align.enabled) scheduleBake();
  else updateTimeline();
}

function editFrame(changes, commit = true) {
  Object.assign(currentFrame(), changes);
  updateAlignSettings({}, commit);
}

// Shortcuts that only make sense in align mode; returns true when the key was used
function handleAlignKey(e, target) {
  if (!alignReady() || !state.align.enabled) return false;
  const key = e.key.toLowerCase();

  if (e.ctrlKey || e.metaKey) {
    if (key === 'z' || key === 'y') {
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redoAlign(); else undoAlign();
      return true;
    }
    return false;
  }
  if (e.altKey) return false;

  const frame = currentFrame();
  const step = e.shiftKey ? 10 : 1;
  const moves = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
  if (moves[key]) {
    stopPlayback();
    editFrame({ dx: frame.dx + moves[key][0] * step, dy: frame.dy + moves[key][1] * step });
  } else if (key === '+' || key === '=' || key === '-' || key === '_') {
    stopPlayback();
    const delta = key === '+' || key === '=' ? 0.01 : -0.01;
    editFrame({ zoom: clamp(Math.round((frame.zoom + delta) * 100) / 100, 0.5, 1.5) });
  } else if (key === 'f') {
    stopPlayback();
    editFrame({ flip: !frame.flip });
  } else if (key === ' ' && !(target && target.closest('button'))) {
    if (state.playing) stopPlayback(); else startPlayback();
  } else {
    return false;
  }
  e.preventDefault();
  return true;
}

function initAlignDrag() {
  const box = $('align-box');
  let drag = null;

  box.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !alignReady() || !state.align.enabled) return;
    e.preventDefault();
    stopPlayback();
    const frame = currentFrame();
    drag = { frame, x: e.clientX, y: e.clientY, dx: frame.dx, dy: frame.dy };
    dragLayout = computeLayout();
    box.setPointerCapture(e.pointerId);
  });

  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { frame } = drag;
    frame.dx = Math.round(drag.dx + (e.clientX - drag.x) / alignDisplayScale);
    frame.dy = Math.round(drag.dy + (e.clientY - drag.y) / alignDisplayScale);
    dragLayout.places.set(frame, placement(frame, refFrame()));
    renderAlignView();
    renderAlignPanel();
  });

  const endDrag = () => {
    if (!drag) return;
    drag = null;
    dragLayout = null;
    commitAlign();
    bakeAligned();
    renderAll();
  };
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);
}

function initAlignPanel() {
  $('align-enabled').addEventListener('change', (e) => updateAlignSettings({ enabled: e.target.checked }));

  $('align-anchor').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-anchor]');
    if (btn) updateAlignSettings({ anchor: btn.dataset.anchor });
  });
  $('align-scale-by').addEventListener('change', (e) => updateAlignSettings({ scaleBy: e.target.value }));
  $('align-max').addEventListener('input', (e) => updateAlignSettings({ maxChange: Number(e.target.value) }, false));
  $('align-padding').addEventListener('input', (e) => {
    updateAlignSettings({ padding: clamp(parseInt(e.target.value) || 0, 0, 200) }, false);
  });
  $('btn-align-set-ref').addEventListener('click', () => updateAlignSettings({ ref: currentFrame() }));

  // Per-frame controls
  ['align-dx', 'align-dy'].forEach(id => {
    $(id).addEventListener('input', (e) => {
      editFrame({ [id === 'align-dx' ? 'dx' : 'dy']: parseInt(e.target.value) || 0 }, false);
    });
  });
  $('align-frame-zoom').addEventListener('input', (e) => editFrame({ zoom: Number(e.target.value) / 100 }, false));
  $('align-flip').addEventListener('change', (e) => editFrame({ flip: e.target.checked }));
  $('btn-align-reset-frame').addEventListener('click', () => editFrame({ dx: 0, dy: 0, zoom: 1, flip: false }));

  // Sliders and number fields update live while in use and become one undo step when let go
  ['align-max', 'align-padding', 'align-dx', 'align-dy', 'align-frame-zoom'].forEach(id => {
    $(id).addEventListener('change', () => updateAlignSettings({}));
  });

  $('btn-align-undo').addEventListener('click', undoAlign);
  $('btn-align-redo').addEventListener('click', redoAlign);

  $('align-zoom').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-zoom]');
    if (!btn) return;
    state.align.zoom = btn.dataset.zoom === 'fit' ? 'fit' : Number(btn.dataset.zoom);
    renderStage();
  });
  $('align-onion').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-onion]');
    if (!btn) return;
    state.align.onion = btn.dataset.onion === 'on';
    renderStage();
  });

  $('btn-align-next').addEventListener('click', () => setMode('export'));
  initAlignDrag();
}
