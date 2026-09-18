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
  const s = clamp(ref.box[dim] / frame.box[dim], 1 - maxChange / 100, 1 + maxChange / 100);
  const b = frame.box;
  const a = ANCHORS[anchor](b);
  return { s, left: (b.x - a.x) * s + frame.dx, top: (b.y - a.y) * s + frame.dy, w: b.w * s, h: b.h * s };
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

// Opaque frames get the reference frame's background around the character
function paintBackground(ctx, layout) {
  const bg = refFrame().background;
  if (!bg) return;
  ctx.fillStyle = `rgb(${bg.join(',')})`;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

function paintFrame(ctx, frame, layout, alpha = 1) {
  const img = loadedImages.get(sourceImage(frame));
  if (!img) return;
  const b = frame.box;
  const r = frameRect(frame, layout);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, b.x, b.y, b.w, b.h, r.x, r.y, r.w, r.h);
  ctx.globalAlpha = 1;
}

// Render every frame at its aligned position; export and the timeline use these images
function bakeAligned() {
  clearTimeout(bakeTimer);
  const layout = computeLayout();
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  state.frames.forEach(frame => {
    ctx.clearRect(0, 0, layout.width, layout.height);
    paintBackground(ctx, layout);
    paintFrame(ctx, frame, layout);
    frame.aligned = { image: canvas.toDataURL('image/png'), width: layout.width, height: layout.height, from: sourceImage(frame) };
  });
}

function scheduleBake() {
  clearTimeout(bakeTimer);
  bakeTimer = setTimeout(() => {
    bakeAligned();
    updateTimeline();
  }, 150);
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
    if (stale.length) {
      const images = stale.map(sourceImage);
      const res = await postJson('/api/content-boxes', { images });
      if (!res.ok) throw new Error((await requestError(res, '找不到角色位置')).message);
      const { frames } = await res.json();
      stale.forEach((f, i) => Object.assign(f, { box: frames[i].box, background: frames[i].background, boxFrom: images[i] }));
    }

    const sources = new Set(state.frames.map(sourceImage));
    for (const src of loadedImages.keys()) if (!sources.has(src)) loadedImages.delete(src);
    await Promise.all([...sources].map(loadImage));
    bakeAligned();
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
    $('align-frame-scale').textContent = `× ${p.s.toFixed(3)}`;
    $('align-frame-offset').textContent = `${frame.dx}, ${frame.dy}`;
    $('btn-align-reset-offset').disabled = !frame.dx && !frame.dy;
  }

  const next = $('btn-align-next');
  next.disabled = keptFrames().length === 0;
  next.innerHTML = `下一步：導出 ${ICONS.arrow}`;
}

// ---------- Editing ----------

function updateAlignSettings(changes) {
  Object.assign(state.align, changes);
  renderStage();
  renderInspector();
  if (state.align.enabled) scheduleBake();
  else updateTimeline();
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
  $('align-max').addEventListener('input', (e) => updateAlignSettings({ maxChange: Number(e.target.value) }));
  $('align-padding').addEventListener('input', (e) => {
    updateAlignSettings({ padding: clamp(parseInt(e.target.value) || 0, 0, 200) });
  });

  $('btn-align-set-ref').addEventListener('click', () => updateAlignSettings({ ref: currentFrame() }));
  $('btn-align-reset-offset').addEventListener('click', () => {
    const frame = currentFrame();
    frame.dx = 0;
    frame.dy = 0;
    updateAlignSettings({});
  });

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
