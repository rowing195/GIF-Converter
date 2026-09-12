// GIF Converter - single-page workspace (split / remove / export modes)

const SUPPORTED_EXT = /\.(gif|webp|png|jpe?g|bmp)$/i;

const MODEL_HINTS = {
  'u2net': '通用模型，已內建可離線使用。衣服容易被挖空時，可改用 IS-Net Anime 或 Human Seg。',
  'isnet-anime': '二次元與動漫角色專用，較不會把服裝挖空。第一次使用需要連網下載。',
  'u2net_human_seg': '真人人像與肢體服裝專用。第一次使用需要連網下載。',
  'u2netp': '輕量模型，邊緣較柔和、不易挖空，但細節較少。第一次使用需要連網下載。',
  'silueta': '抓取整體主體外框。第一次使用需要連網下載。',
  'isnet-general-use': '高精細分割，適合物件與商品。第一次使用需要連網下載。'
};

const ICONS = {
  upload: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  fileX: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="10" y1="12" x2="14" y2="16"/><line x1="14" y1="12" x2="10" y2="16"/></svg>',
  drop: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><polyline points="7 10 12 15 17 10"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  ban: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  checkSmall: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  spin: '<svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>',
  spinLarge: '<svg class="spin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  sparkle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><polyline points="7 10 12 15 17 10"/><path d="M5 20h14"/></svg>'
};

const state = {
  file: null,         // { name, baseName, width, height, isStatic }
  frames: [],         // see loadDecomposed()
  current: 0,         // position in state.frames
  mode: 'upload',     // upload | split | remove | export
  view: 'removed',    // remove mode: which image the stage shows
  zoom: 'fit',
  timelineScale: 0.64, // px per ms on the timeline
  uploading: false,
  removal: { running: false, done: 0, total: 0, processingPos: -1, model: '', error: null },
  playing: false,
  playTimer: null,
  exportPos: 0,
  ssColsTouched: false,
  exporting: false,
  exportResult: null  // { ok, message }
};

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  initDragAndDrop();
  initModeSwitch();
  initStageControls();
  initSplitPanel();
  initRemovePanel();
  initExportPanel();
  initTimeline();
  initKeyboard();
  window.addEventListener('resize', () => renderStage());
  renderAll();
});

// ---------- Helpers ----------

const keptFrames = () => state.frames.filter(f => f.keep);
const currentFrame = () => state.frames[state.current];
const pad2 = (n) => String(n).padStart(2, '0');
const frameLabel = (f) => `#${pad2(f.index)}`;
const outputImage = (f) => f.removed || f.image;
const totalDuration = (frames) => frames.reduce((sum, f) => sum + f.duration, 0);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatTimecode(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor(ms / 1000) % 60;
  return `${pad2(minutes)}:${pad2(seconds)}.${String(ms % 1000).padStart(3, '0')}`;
}

const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

function modelLabel(model) {
  const option = $('rembg-model').querySelector(`option[value="${model}"]`);
  return option ? option.textContent.split(' · ')[0] : model;
}

function downloadDataUrl(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}

async function postJson(url, body) {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('連不上 GIF Converter，請確認程式視窗還開著，再試一次。');
  }
}

async function errorDetail(res, fallback) {
  try {
    const data = await res.json();
    return data.detail || fallback;
  } catch {
    return `${fallback}（HTTP ${res.status}）`;
  }
}

function setChips(container, chips) {
  container.replaceChildren(...chips.map(({ text, mono, tone }) => {
    const el = document.createElement('div');
    el.className = `chip${mono ? ' chip-mono' : ''}${tone ? ` chip-${tone}` : ''}`;
    el.textContent = text;
    return el;
  }));
}

// ---------- Rendering ----------

function renderAll() {
  renderShell();
  renderStage();
  renderInspector();
  updateTimeline();
}

function renderShell() {
  const app = $('app');
  const { file, mode, removal } = state;
  app.classList.toggle('has-file', !!file);
  app.classList.toggle('is-static', !!file && file.isStatic);
  ['upload', 'split', 'remove', 'export'].forEach(m => app.classList.toggle(`mode-${m}`, mode === m));

  $('file-name').textContent = file ? file.name : '尚未載入檔案';
  $('file-meta').textContent = file
    ? (file.isStatic
      ? `${file.width}×${file.height} · 靜態圖片`
      : `${file.width}×${file.height} · ${state.frames.length} 幀 · ${formatSeconds(totalDuration(state.frames))}`)
    : '';

  $('mode-switch').querySelectorAll('button').forEach(btn => {
    const m = btn.dataset.mode;
    btn.classList.toggle('is-active', mode === m);
    btn.hidden = !!file && file.isStatic && m !== 'remove';
    btn.disabled = !file || (removal.running && m !== 'remove') || (m === 'export' && keptFrames().length === 0);
  });

  const home = $('btn-home');
  home.hidden = !file;
  home.disabled = removal.running;
  home.classList.toggle('is-disabled', removal.running);
}

function renderStage() {
  const { mode } = state;
  $('upload-card').hidden = mode !== 'upload';
  $('viewer').hidden = !(mode === 'split' || mode === 'remove');
  $('export-preview').hidden = mode !== 'export';

  if (mode === 'split' || mode === 'remove') renderViewer();
  if (mode === 'export') renderExportPreview();
}

function renderViewer() {
  const frame = currentFrame();
  if (!frame) return;
  const { mode, removal, file } = state;
  const showRemoved = mode === 'remove' && state.view === 'removed' && !!frame.removed && !frame.waiting;

  const img = $('frame-img');
  const src = showRemoved ? frame.removed : frame.image;
  if (img.getAttribute('src') !== src) img.src = src;

  // Size the frame box for the chosen zoom (the progress card reserves room at the bottom)
  $('viewer').classList.toggle('is-processing', mode === 'remove' && removal.running);
  const scroll = $('viewer-scroll');
  let scale;
  if (state.zoom === 'fit') {
    const pad = getComputedStyle(scroll);
    const availW = Math.max(scroll.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight), 64);
    const availH = Math.max(scroll.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom), 64);
    scale = Math.min(availW / frame.width, availH / frame.height);
  } else {
    scale = Number(state.zoom);
  }
  img.style.width = `${Math.max(1, Math.round(frame.width * scale))}px`;
  img.style.height = `${Math.max(1, Math.round(frame.height * scale))}px`;
  $('frame-box').classList.toggle('is-pixelated', scale >= 2);

  $('zoom-control').querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.zoom === String(state.zoom));
  });

  // Status chips
  const chips = file.isStatic ? [] : [
    { text: frameLabel(frame), mono: true, tone: 'accent' },
    { text: `${frame.duration} ms`, mono: true }
  ];
  let status;
  if (!frame.keep) status = mode === 'remove' ? '已略過，不會去背' : '已略過';
  else if (mode === 'split') status = '原始影格';
  else if (removal.running && state.frames.indexOf(frame) === removal.processingPos) status = '去背中…';
  else if (showRemoved) status = frame.edited ? '已手動微調' : `已去背 · ${modelLabel(frame.removedModel)}`;
  else status = frame.removed ? '原始影格' : '原始影格 · 尚未去背';
  chips.push({ text: status, tone: 'muted' });
  setChips($('stage-chips'), chips);

  // Original / removed toggle
  const toggle = $('view-toggle');
  toggle.hidden = mode !== 'remove';
  toggle.querySelectorAll('button').forEach(btn => {
    const isRemovedBtn = btn.dataset.view === 'removed';
    btn.disabled = isRemovedBtn && (!frame.removed || frame.waiting);
    btn.classList.toggle('is-active', isRemovedBtn ? showRemoved : !showRemoved);
  });

  // Removal progress
  $('progress-card').hidden = !(mode === 'remove' && removal.running);
  if (removal.running) {
    const processing = state.frames[removal.processingPos];
    $('progress-count').innerHTML = `<span class="accent">${removal.done}</span> / ${removal.total}`;
    $('progress-sub').textContent = processing
      ? `目前處理 ${file.isStatic ? '' : frameLabel(processing) + ' · '}${modelLabel(removal.model)}`
      : modelLabel(removal.model);
    $('progress-fill').style.width = `${(removal.done / removal.total) * 100}%`;
  }
}

function renderExportPreview() {
  renderExportAnimation();
  renderSheetPreview();
}

function renderExportAnimation() {
  const kept = keptFrames();
  if (!kept.length) return;

  // Animated preview (fits a 340px box)
  const frame = kept[state.exportPos % kept.length];
  const animImg = $('export-anim');
  const src = outputImage(frame);
  if (animImg.getAttribute('src') !== src) animImg.src = src;
  const scale = Math.min(340 / frame.width, 340 / frame.height);
  animImg.style.width = `${Math.round(frame.width * scale)}px`;
  animImg.style.height = `${Math.round(frame.height * scale)}px`;
  $('export-anim-box').classList.toggle('is-pixelated', scale >= 2);

  setChips($('export-chips'), [
    { text: '預覽' },
    { text: `${kept.length} 幀 · ${formatSeconds(totalDuration(kept))}`, mono: true }
  ]);
}

// Sprite sheet layout, mirroring the backend's size formula
function renderSheetPreview() {
  const kept = keptFrames();
  if (!kept.length) return;
  const wantsSheet = selectedExportTypes().includes('spritesheet');
  $('sheet-preview').hidden = !wantsSheet;
  if (!wantsSheet) return;

  const cols = Math.max(1, parseInt($('ss-cols').value) || 1);
  const padding = Math.max(0, parseInt($('ss-padding').value) || 0);
  const rows = Math.ceil(kept.length / cols);
  const { width: fw, height: fh } = kept[0];
  const sheetW = cols * fw + (cols + 1) * padding;
  const sheetH = rows * fh + (rows + 1) * padding;
  $('sheet-size').textContent = `${cols} 欄 × ${rows} 列 · ${sheetW.toLocaleString()} × ${sheetH.toLocaleString()} px`;

  const stageW = $('export-preview').clientWidth - 64;
  const cell = Math.max(8, Math.floor(Math.min(56, (Math.min(stageW, 960) - 4) / cols - 2, 220 / rows - 2)));
  const cellH = Math.max(8, Math.round(cell * fh / fw));
  const grid = $('sheet-grid');
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  grid.style.gridAutoRows = `${cellH}px`;
  grid.replaceChildren(...kept.map(f => {
    const im = document.createElement('img');
    im.src = outputImage(f);
    im.alt = '';
    return im;
  }));
}

function renderInspector() {
  const panelMode = state.mode;
  document.querySelectorAll('.panel').forEach(p => { p.hidden = p.dataset.panel !== panelMode; });
  if (panelMode === 'split') renderSplitPanel();
  if (panelMode === 'remove') renderRemovePanel();
  if (panelMode === 'export') renderExportPanel();
}

function renderSplitPanel() {
  const frame = currentFrame();
  const kept = keptFrames();
  $('split-frame-no').textContent = frameLabel(frame);
  $('split-frame-pos').textContent = `第 ${state.current + 1} / ${state.frames.length} 幀`;
  $('split-duration').textContent = `${frame.duration} ms`;
  $('split-start').textContent = formatTimecode(frame.start);
  $('split-size').textContent = `${frame.width} × ${frame.height}`;
  $('split-keep').checked = frame.keep;
  $('split-summary').innerHTML = `保留 <span class="mono accent">${kept.length}</span> / ${state.frames.length} 幀 · 共 <span class="mono">${formatSeconds(totalDuration(kept))}</span>`;
  $('split-export-label').textContent = `導出 ${frameLabel(frame)} 為 PNG`;

  const next = $('btn-goto-remove');
  next.disabled = kept.length === 0;
  next.innerHTML = kept.length === 0 ? '請先保留至少 1 幀' : `下一步：去背 ${ICONS.arrow}`;
}

// Decide what the Remove panel's buttons do for the current situation
function removePlan() {
  const { removal, file } = state;
  if (removal.running) {
    return { primary: { html: `${ICONS.spin} 去背中 ${removal.done} / ${removal.total}`, disabled: true } };
  }
  if (file.isStatic) {
    const frame = state.frames[0];
    return frame.removed
      ? { primary: { html: `${ICONS.download} 下載透明 PNG`, action: () => downloadDataUrl(frame.removed, `${file.baseName}_rembg.png`) },
          secondary: () => runRemoval([frame]) }
      : { primary: { html: `${ICONS.sparkle} 開始去背`, action: () => runRemoval([frame]) } };
  }
  const kept = keptFrames();
  const missing = kept.filter(f => !f.removed);
  if (kept.length === 0) return { primary: { html: '請先保留至少 1 幀', disabled: true } };
  if (missing.length === kept.length) {
    return { primary: { html: `${ICONS.sparkle} 開始去背（${kept.length} 幀）`, action: () => runRemoval(missing) } };
  }
  if (missing.length > 0) {
    return {
      primary: { html: `${ICONS.sparkle} 去背剩下的 ${missing.length} 幀`, action: () => runRemoval(missing) },
      secondary: () => runRemoval(kept)
    };
  }
  return {
    primary: { html: `下一步：導出 ${ICONS.arrow}`, action: () => setMode('export') },
    secondary: () => runRemoval(kept)
  };
}

let removePrimaryAction = null;
let removeSecondaryAction = null;

function renderRemovePanel() {
  const { removal, file } = state;
  const frame = currentFrame();
  const kept = file.isStatic ? state.frames : keptFrames();
  const processed = kept.filter(f => f.removed);
  const editedCount = kept.filter(f => f.edited).length;

  // Status row
  const status = $('remove-status');
  status.className = 'status-row';
  status.hidden = false;
  if (removal.running) {
    status.classList.add('is-running');
    status.innerHTML = `${ICONS.spin}<span>去背中，已完成 ${removal.done} / ${removal.total} ${file.isStatic ? '' : '幀'}</span>`;
  } else if (removal.error) {
    status.classList.add('is-error');
    status.innerHTML = `${ICONS.alert}<span>去背中斷</span><span class="status-detail"></span>`;
    status.querySelector('.status-detail').textContent = `${removal.error}${processed.length ? `（已完成的 ${processed.length} 幀會保留）` : ''}`;
  } else if (processed.length && processed.length === kept.length) {
    status.classList.add('is-success');
    status.innerHTML = `${ICONS.check}<span>${file.isStatic ? '去背完成' : `已完成 ${processed.length} 幀去背`}</span>`;
    if (editedCount) status.insertAdjacentHTML('beforeend', `<span class="status-extra">${file.isStatic ? '已手動微調' : `${editedCount} 幀已微調`}</span>`);
  } else if (processed.length) {
    status.innerHTML = `<span class="muted">已完成 ${processed.length} / ${kept.length} 幀去背</span>`;
  } else {
    status.hidden = true;
  }

  $('remove-settings').disabled = removal.running;
  $('processing-note').hidden = !removal.running;
  $('model-hint').textContent = MODEL_HINTS[$('rembg-model').value] || '';

  // Touch-up for the current frame
  const canTouchUp = !removal.running && !!frame.removed && !frame.waiting;
  $('touchup-section').hidden = !canTouchUp;
  if (canTouchUp) {
    $('touchup-label').textContent = file.isStatic ? '手動修正' : `目前這一幀 · ${frameLabel(frame)}`;
    $('btn-touchup-export').hidden = file.isStatic;
    $('touchup-buttons').style.gridTemplateColumns = file.isStatic ? 'repeat(2, minmax(0, 1fr))' : '';
    $('btn-touchup-restore').disabled = !frame.edited;
  }

  const plan = removePlan();
  const primary = $('btn-remove-primary');
  primary.innerHTML = plan.primary.html;
  primary.disabled = !!plan.primary.disabled;
  removePrimaryAction = plan.primary.action || null;
  $('btn-remove-secondary').hidden = !plan.secondary;
  removeSecondaryAction = plan.secondary || null;
}

function selectedExportTypes() {
  return [...document.querySelectorAll('input[name="export-type"]:checked')].map(el => el.value);
}

function renderExportPanel() {
  const types = selectedExportTypes();
  document.querySelectorAll('.format-options').forEach(el => {
    el.classList.toggle('is-off', !types.includes(el.dataset.optionsFor));
  });

  const kept = keptFrames();
  const processed = kept.filter(f => f.removed).length;
  const mixed = $('export-mixed-note');
  mixed.hidden = !(processed > 0 && processed < kept.length);
  if (!mixed.hidden) mixed.textContent = `有 ${kept.length - processed} 幀還沒去背，導出時會使用原圖。`;

  const fileCount = types.length + (types.includes('spritesheet') ? 1 : 0);
  const btn = $('btn-export');
  btn.disabled = state.exporting || types.length === 0 || kept.length === 0;
  $('export-label').textContent = state.exporting
    ? '正在產生檔案…'
    : (types.length === 0 ? '請至少選擇一種格式' : `導出 ${types.length} 種格式`);

  const note = $('export-note');
  note.className = 'footer-note';
  if (state.exportResult) {
    note.textContent = state.exportResult.message;
    note.classList.add(state.exportResult.ok ? 'is-success' : 'is-error');
  } else {
    note.textContent = types.length ? `共 ${fileCount} 個檔案，存到瀏覽器的下載資料夾` : '';
  }
}

// ---------- Timeline ----------

function buildTimeline() {
  const ruler = $('ruler');
  const strip = $('strip');
  ruler.replaceChildren();
  strip.replaceChildren();

  state.frames.forEach((frame, pos) => {
    const width = Math.max(64, Math.round(frame.duration * state.timelineScale));

    const seg = document.createElement('div');
    seg.className = 'ruler-seg';
    seg.style.width = `${width}px`;
    seg.textContent = (frame.start / 1000).toFixed(2);
    ruler.appendChild(seg);

    const el = document.createElement('div');
    el.className = 'tl-frame';
    el.style.width = `${width}px`;
    el.dataset.pos = pos;
    el.innerHTML = `
      <div class="tl-thumb">
        <div class="tl-img checker"><img alt=""></div>
        <div class="tl-hold"></div>
        <button type="button" class="tl-keep" aria-label="切換保留">${ICONS.checkSmall}</button>
      </div>
      <div class="tl-label">${pad2(frame.index)}</div>`;
    frame.el = el;
    strip.appendChild(el);
  });
}

function updateTimeline() {
  const hasFrames = state.frames.length > 0 && !(state.file && state.file.isStatic);
  $('timeline-empty').hidden = hasFrames;
  $('timeline-track').hidden = !hasFrames;
  $('btn-play').disabled = !hasFrames;
  $('btn-play').classList.toggle('is-playing', state.playing);
  $('timeline-zoom').disabled = !hasFrames;

  if (!hasFrames) {
    $('timecode').innerHTML = '00:00.000 <span class="dim">/ 00:00.000</span>';
    $('keep-count').textContent = '';
    $('legend-edited').hidden = true;
    return;
  }

  const { mode, removal } = state;
  const kept = keptFrames();
  state.frames.forEach((frame, pos) => {
    const el = frame.el;
    const processing = removal.running && pos === removal.processingPos;
    el.classList.toggle('is-current', pos === state.current);
    el.classList.toggle('is-skipped', !frame.keep);
    el.classList.toggle('is-edited', frame.edited && mode !== 'split');
    el.classList.toggle('is-waiting', frame.waiting && !processing);

    const img = el.querySelector('img');
    const src = mode === 'split' || frame.waiting || !frame.keep ? frame.image : outputImage(frame);
    if (img.getAttribute('src') !== src) img.src = src;

    const imgBox = el.querySelector('.tl-img');
    let busy = imgBox.querySelector('.tl-busy');
    if (processing && !busy) imgBox.insertAdjacentHTML('beforeend', `<div class="tl-busy">${ICONS.spinLarge}</div>`);
    if (!processing && busy) busy.remove();

    let dot = imgBox.querySelector('.tl-dot');
    if (frame.edited && !dot) imgBox.insertAdjacentHTML('beforeend', '<span class="tl-dot"></span>');
    if (!frame.edited && dot) dot.remove();
  });

  const current = currentFrame();
  $('playhead').style.transform = `translateX(${current.el.offsetLeft}px)`;

  $('timecode').innerHTML = `${formatTimecode(current.start)} <span class="dim">/ ${formatTimecode(totalDuration(state.frames))}</span>`;
  $('keep-count').innerHTML = mode === 'export'
    ? `導出範圍：保留的 <span class="mono accent">${kept.length}</span> 幀`
    : `保留 <span class="mono accent">${kept.length}</span> / ${state.frames.length}`;
  $('legend-edited').hidden = mode === 'split' || !state.frames.some(f => f.edited);
}

function scrollCurrentIntoView() {
  const el = currentFrame()?.el;
  if (!el) return;
  const scroller = $('timeline-scroll');
  const left = el.offsetLeft;
  const right = left + el.offsetWidth;
  if (left < scroller.scrollLeft + 16) scroller.scrollLeft = left - 16;
  else if (right > scroller.scrollLeft + scroller.clientWidth - 16) scroller.scrollLeft = right - scroller.clientWidth + 16;
}

function selectFrame(pos) {
  if (!state.frames.length) return;
  state.current = Math.min(Math.max(pos, 0), state.frames.length - 1);
  renderStage();
  renderInspector();
  updateTimeline();
  scrollCurrentIntoView();
}

function toggleKeep(pos) {
  const frame = state.frames[pos];
  if (!frame || state.removal.running) return;
  frame.keep = !frame.keep;
  renderAll();
}

function setAllKeep(fn) {
  if (state.removal.running) return;
  state.frames.forEach(f => { f.keep = fn(f); });
  renderAll();
}

function initTimeline() {
  $('strip').addEventListener('click', (e) => {
    const el = e.target.closest('.tl-frame');
    if (!el) return;
    const pos = Number(el.dataset.pos);
    if (e.target.closest('.tl-keep')) {
      toggleKeep(pos);
      return;
    }
    stopPlayback();
    selectFrame(pos);
  });

  $('btn-play').addEventListener('click', () => (state.playing ? stopPlayback() : startPlayback()));

  $('timeline-zoom').addEventListener('input', (e) => {
    state.timelineScale = Number(e.target.value);
    buildTimeline();
    updateTimeline();
    scrollCurrentIntoView();
  });
}

// ---------- Playback ----------

function startPlayback() {
  if (!state.frames.length || (state.file && state.file.isStatic)) return;
  stopPlayback();
  state.playing = true;
  updateTimeline();
  scheduleNextFrame();
}

function stopPlayback() {
  clearTimeout(state.playTimer);
  state.playTimer = null;
  if (state.playing) {
    state.playing = false;
    updateTimeline();
  }
}

function scheduleNextFrame() {
  if (!state.playing) return;
  if (state.mode === 'export') {
    const kept = keptFrames();
    if (!kept.length) return stopPlayback();
    const frame = kept[state.exportPos % kept.length];
    state.playTimer = setTimeout(() => {
      state.exportPos = (state.exportPos + 1) % kept.length;
      renderExportAnimation();
      scheduleNextFrame();
    }, frame.duration);
    return;
  }

  // Split / remove: step through the kept frames (all frames if none are kept)
  const sequence = state.frames.map((f, pos) => pos).filter(pos => state.frames[pos].keep);
  const positions = sequence.length ? sequence : state.frames.map((f, pos) => pos);
  state.playTimer = setTimeout(() => {
    const next = positions.find(pos => pos > state.current);
    selectFrame(next === undefined ? positions[0] : next);
    scheduleNextFrame();
  }, currentFrame().duration);
}

// ---------- Modes ----------

function setMode(mode) {
  const { file, removal } = state;
  if (!file || state.mode === mode) return;
  if (file.isStatic && mode !== 'remove') return;
  if (removal.running && mode !== 'remove') return;
  if (mode === 'export' && keptFrames().length === 0) return;

  stopPlayback();
  state.mode = mode;
  state.exportResult = null;

  if (mode === 'export') {
    const kept = keptFrames();
    if (!state.ssColsTouched) $('ss-cols').value = kept.length;
    state.exportPos = 0;
  }
  if (mode === 'remove') state.view = 'removed';

  renderAll();
  if (mode === 'export') startPlayback();
}

function initModeSwitch() {
  $('mode-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (btn && !btn.disabled) setMode(btn.dataset.mode);
  });
  $('btn-home').addEventListener('click', () => {
    if (!state.removal.running) location.reload();
  });
}

function initStageControls() {
  $('zoom-control').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-zoom]');
    if (!btn) return;
    state.zoom = btn.dataset.zoom === 'fit' ? 'fit' : Number(btn.dataset.zoom);
    renderStage();
  });
  $('view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn || btn.disabled) return;
    state.view = btn.dataset.view;
    renderStage();
  });
}

function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (!state.file || state.file.isStatic || state.mode === 'upload' || state.mode === 'export') return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      stopPlayback();
      selectFrame(state.current + (e.key === 'ArrowLeft' ? -1 : 1));
    } else if (e.key === ' ' && state.mode === 'split' && !(target && target.closest('button'))) {
      e.preventDefault();
      toggleKeep(state.current);
    }
  });
}

// ---------- Upload ----------

function initUpload() {
  const input = $('file-input');
  $('btn-choose-file').addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) openFile(e.target.files[0]);
    input.value = '';
  });
}

function setUploadCard({ variant, title, sub, showButton, buttonText, showExt, showFormats, fileName }) {
  const card = $('upload-card');
  card.classList.toggle('is-error', variant === 'error');
  $('upload-icon').innerHTML = variant === 'loading' ? '<div class="spinner"></div>' : (variant === 'error' ? ICONS.fileX : ICONS.upload);

  const titleEl = $('upload-title');
  titleEl.textContent = title;
  if (fileName) {
    const name = document.createElement('span');
    name.className = 'mono';
    name.textContent = fileName;
    titleEl.append(name);
  }
  $('upload-sub').textContent = sub;
  $('btn-choose-file').hidden = !showButton;
  $('btn-choose-file').textContent = buttonText || '選擇檔案';
  $('upload-ext').hidden = !showExt;
  $('upload-formats').hidden = !showFormats;
}

async function openFile(file) {
  if (state.uploading || state.file) return;

  if (!SUPPORTED_EXT.test(file.name)) {
    const ext = (file.name.match(/\.([^.]+)$/) || [])[1];
    setUploadCard({
      variant: 'error',
      title: '無法開啟 ',
      fileName: file.name,
      sub: ext ? `不支援 .${ext.toLowerCase()} 格式，請改用下列其中一種格式再試一次。` : '無法辨識檔案格式，請改用下列其中一種格式再試一次。',
      showButton: true,
      buttonText: '選擇其他檔案',
      showFormats: true
    });
    return;
  }

  state.uploading = true;
  setUploadCard({ variant: 'loading', title: '正在讀取 ', fileName: file.name, sub: '正在拆解影格與每幀時長' });

  try {
    const formData = new FormData();
    formData.append('file', file);
    let res;
    try {
      res = await fetch('/api/decompose-gif', { method: 'POST', body: formData });
    } catch {
      throw new Error('連不上 GIF Converter，請確認程式視窗還開著，再試一次。');
    }
    // The backend's message here is a raw Pillow error, so show a readable one instead
    if (!res.ok) throw new Error('檔案可能已損毀，或不是有效的圖片。');
    loadDecomposed(await res.json());
  } catch (err) {
    setUploadCard({
      variant: 'error',
      title: '無法開啟 ',
      fileName: file.name,
      sub: err.message,
      showButton: true,
      buttonText: '選擇其他檔案',
      showFormats: true
    });
  } finally {
    state.uploading = false;
  }
}

function loadDecomposed(data) {
  let start = 0;
  state.frames = data.frames.map(f => {
    const frame = {
      index: f.index,
      duration: f.duration,
      image: f.image,
      width: f.width,
      height: f.height,
      start,
      keep: true,
      removed: null,       // background-removed image, possibly hand-edited
      removedAuto: null,   // last AI result, kept so a hand edit can be restored
      removedModel: '',
      edited: false,
      waiting: false,
      el: null
    };
    start += f.duration;
    return frame;
  });

  state.file = {
    name: data.filename,
    baseName: data.filename.replace(/\.[^/.]+$/, ''),
    width: data.width,
    height: data.height,
    isStatic: !data.is_animated
  };
  state.current = 0;
  state.mode = state.file.isStatic ? 'remove' : 'split';
  state.view = 'removed';

  buildTimeline();
  renderAll();
}

// ---------- Drag & drop ----------

function describeDraggedType(type) {
  if (type === 'image/gif') return { label: 'GIF', text: '動圖，放開後會拆成逐幀' };
  if (type === 'image/webp') return { label: 'WebP', text: '動態 WebP 會拆成逐幀，靜態的會直接去背' };
  if (type === 'image/png') return { label: 'PNG', text: '靜態圖片，放開後直接去背' };
  if (type === 'image/jpeg') return { label: 'JPG', text: '靜態圖片，放開後直接去背' };
  if (type === 'image/bmp') return { label: 'BMP', text: '靜態圖片，放開後直接去背' };
  return null;
}

function showDropOverlay(e) {
  const overlay = $('drop-overlay');
  const content = $('drop-content');
  overlay.className = 'drop-overlay';
  content.replaceChildren();

  if (state.file) {
    overlay.classList.add('is-busy');
    content.innerHTML = `
      <div class="drop-badge">${ICONS.ban}</div>
      <div class="drop-title">目前已開啟 <span class="mono"></span></div>
      <div class="drop-message">放開不會有任何動作，挑好的影格和去背結果都會保留。<br>要處理新檔案，請先按右上角的「回首頁」。</div>`;
    content.querySelector('.mono').textContent = state.file.name;
    $('btn-home').classList.add('btn-home-highlight');
  } else {
    const item = e.dataTransfer.items && e.dataTransfer.items[0];
    const type = item ? item.type : '';
    const described = describeDraggedType(type);
    if (type && !described) {
      overlay.classList.add('is-unsupported');
      content.innerHTML = `
        <div class="drop-badge">${ICONS.fileX}</div>
        <div class="drop-title">不支援這種檔案</div>
        <div class="drop-message">請改用 .gif、.webp、.png、.jpg 或 .bmp。</div>`;
    } else {
      content.innerHTML = `
        <div class="drop-badge">${ICONS.drop}</div>
        <div class="drop-title">放開以開啟檔案</div>`;
      if (described) {
        content.insertAdjacentHTML('beforeend', `<div class="drop-type"><span class="mono accent">${described.label}</span><span class="muted">${described.text}</span></div>`);
      }
    }
  }
  overlay.hidden = false;
}

function hideDropOverlay() {
  $('drop-overlay').hidden = true;
  $('btn-home').classList.remove('btn-home-highlight');
}

function initDragAndDrop() {
  // dragenter/dragleave also fire for child elements; count them to know when the pointer really left
  let depth = 0;
  const draggingFile = (e) => e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

  document.addEventListener('dragenter', (e) => {
    if (!draggingFile(e) || state.uploading) return;
    e.preventDefault();
    if (depth++ === 0) showDropOverlay(e);
  });

  document.addEventListener('dragover', (e) => {
    if (!draggingFile(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = state.file || state.uploading ? 'none' : 'copy';
  });

  document.addEventListener('dragleave', (e) => {
    if (!draggingFile(e)) return;
    if (--depth <= 0) {
      depth = 0;
      hideDropOverlay();
    }
  });

  document.addEventListener('drop', (e) => {
    if (!draggingFile(e)) return;
    e.preventDefault();
    depth = 0;
    hideDropOverlay();
    // Once a file is open, drops are ignored so the current work cannot be replaced by accident
    if (!state.file && !state.uploading && e.dataTransfer.files.length > 0) openFile(e.dataTransfer.files[0]);
  });
}

// ---------- Split panel ----------

function initSplitPanel() {
  $('split-keep').addEventListener('change', () => toggleKeep(state.current));
  $('btn-keep-all').addEventListener('click', () => setAllKeep(() => true));
  $('btn-keep-none').addEventListener('click', () => setAllKeep(() => false));
  $('btn-keep-invert').addEventListener('click', () => setAllKeep(f => !f.keep));
  $('btn-goto-remove').addEventListener('click', () => setMode('remove'));
  $('btn-split-export-frame').addEventListener('click', () => {
    const frame = currentFrame();
    downloadDataUrl(frame.image, `${state.file.baseName}_frame_${pad2(frame.index)}.png`);
  });
}

// ---------- Remove panel ----------

function readRemovalSettings() {
  return {
    model: $('rembg-model').value || 'u2net',
    alpha_cutoff: parseInt($('rembg-cutoff').value) || 10,
    post_process_mask: $('rembg-post-process').checked,
    alpha_matting: $('rembg-alpha-matting').checked,
    alpha_matting_foreground_threshold: parseInt($('rembg-fg-threshold').value) || 200
  };
}

async function runRemoval(targets) {
  if (!targets.length || state.removal.running) return;

  const editedCount = targets.filter(f => f.edited).length;
  if (editedCount && !confirm(`有 ${editedCount} 幀手動微調過，重新去背會覆蓋掉這些修改。確定要繼續嗎？`)) return;

  const settings = readRemovalSettings();
  stopPlayback();
  targets.forEach(f => { f.waiting = true; });
  Object.assign(state.removal, { running: true, done: 0, total: targets.length, processingPos: -1, model: settings.model, error: null });
  renderAll();

  try {
    // One request per frame so progress is real; the backend reuses the loaded model between calls
    for (const frame of targets) {
      state.removal.processingPos = state.frames.indexOf(frame);
      renderAll();

      const res = await postJson('/api/u2net-rembg', {
        frames: [{ index: frame.index, duration: frame.duration, image: frame.image }],
        ...settings
      });
      if (!res.ok) throw new Error(await errorDetail(res, '去背失敗'));

      const result = (await res.json()).frames[0];
      Object.assign(frame, { removed: result.image, removedAuto: result.image, removedModel: settings.model, edited: false, waiting: false });
      state.removal.done++;
    }
  } catch (err) {
    state.removal.error = err.message;
  } finally {
    targets.forEach(f => { f.waiting = false; });
    state.removal.running = false;
    state.removal.processingPos = -1;
    state.view = 'removed';
    renderAll();
  }
}

function initRemovePanel() {
  $('rembg-model').addEventListener('change', () => renderInspector());

  $('rembg-cutoff').addEventListener('input', (e) => { $('rembg-cutoff-val').textContent = e.target.value; });
  $('rembg-fg-threshold').addEventListener('input', (e) => { $('rembg-fg-val').textContent = e.target.value; });
  $('rembg-alpha-matting').addEventListener('change', (e) => { $('fg-threshold-field').hidden = !e.target.checked; });

  $('btn-remove-primary').addEventListener('click', () => { if (removePrimaryAction) removePrimaryAction(); });
  $('btn-remove-secondary').addEventListener('click', () => { if (removeSecondaryAction) removeSecondaryAction(); });

  $('btn-touchup-export').addEventListener('click', () => {
    const frame = currentFrame();
    downloadDataUrl(outputImage(frame), `${state.file.baseName}_frame_${pad2(frame.index)}.png`);
  });

  $('touchup-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    const frame = currentFrame();
    e.target.value = '';
    if (!file || !frame.removed) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      frame.removed = evt.target.result;
      frame.edited = true;
      state.view = 'removed';
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  $('btn-touchup-restore').addEventListener('click', () => {
    const frame = currentFrame();
    if (!frame.edited) return;
    frame.removed = frame.removedAuto;
    frame.edited = false;
    renderAll();
  });
}

// ---------- Export panel ----------

function initExportPanel() {
  document.querySelectorAll('input[name="export-type"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.exportResult = null;
      renderInspector();
      renderExportPreview();
    });
  });

  ['ss-cols', 'ss-padding'].forEach(id => {
    $(id).addEventListener('input', () => {
      if (id === 'ss-cols') state.ssColsTouched = true;
      renderExportPreview();
    });
  });

  $('btn-export').addEventListener('click', runExport);
}

async function runExport() {
  const types = selectedExportTypes();
  const kept = keptFrames();
  if (!types.length || !kept.length || state.exporting) return;

  state.exporting = true;
  state.exportResult = null;
  renderExportPanel();

  const payload = {
    frames: kept.map(f => ({ index: f.index, duration: f.duration, image: outputImage(f) })),
    export_types: types,
    gif_options: {
      fps_override: parseFloat($('gif-fps').value) || null,
      loop: parseInt($('gif-loop').value) || 0
    },
    webp_options: {
      fps_override: parseFloat($('webp-fps').value) || null,
      loop: parseInt($('webp-loop').value) || 0,
      lossless: $('webp-lossless').checked
    },
    spritesheet_options: {
      columns: parseInt($('ss-cols').value) || kept.length,
      padding: parseInt($('ss-padding').value) || 0,
      transparent_bg: $('ss-transparent').checked
    }
  };

  try {
    const res = await postJson('/api/synthesize', payload);
    if (!res.ok) throw new Error(await errorDetail(res, '導出失敗'));
    const data = await res.json();

    const base = state.file.baseName;
    const downloads = [];
    if (data.gif) downloads.push([data.gif.data_url, `${base}_new.gif`]);
    if (data.webp) downloads.push([data.webp.data_url, `${base}_animated.webp`]);
    if (data.spritesheet) {
      downloads.push([data.spritesheet.data_url, `${base}_spritesheet.png`]);
      const json = new Blob([JSON.stringify(data.spritesheet.meta, null, 2)], { type: 'application/json' });
      downloads.push([URL.createObjectURL(json), `${base}_spritesheet.json`]);
    }

    // Browsers drop rapid back-to-back downloads, so space them out
    for (const [href, name] of downloads) {
      downloadDataUrl(href, name);
      await sleep(300);
      if (href.startsWith('blob:')) URL.revokeObjectURL(href);
    }
    state.exportResult = { ok: true, message: `已導出 ${downloads.length} 個檔案` };
  } catch (err) {
    state.exportResult = { ok: false, message: `導出失敗：${err.message}` };
  } finally {
    state.exporting = false;
    renderExportPanel();
  }
}
