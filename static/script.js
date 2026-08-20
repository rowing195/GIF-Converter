// GIF Converter - Frontend Controller State
const state = {
  filename: '',
  width: 0,
  height: 0,
  rawFrames: [],       // Decomposed original frames: [{index, duration, image}]
  selectedFrames: [],  // Filtered frames kept for Stage 2 & 3
  rembgFrames: [],     // Transparent frames output from U2-Net
  useRembg: true,
  synthesisResult: null
};

document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
  initStage1Controls();
  initStage2Controls();
  initStage3Controls();
});

// --- Upload & Dropzone Handling ---
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('gif-input');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleGifUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleGifUpload(e.target.files[0]);
    }
  });
}

async function handleGifUpload(file) {
  if (!file.name.match(/\.(gif|webp)$/i)) {
    alert('請上傳有效的 .gif 或動態 .webp 檔案！');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  // Show loading UI on dropzone
  const dropzone = document.getElementById('dropzone');
  dropzone.innerHTML = `
    <div class="spinner"></div>
    <h2>正在拆解 GIF 影格中...</h2>
    <p class="dropzone-hint">正在解析每幀圖像與間隙時間 (ms)</p>
  `;

  try {
    const res = await fetch('/api/decompose-gif', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'GIF 拆解失敗');
    }

    const data = await res.json();
    state.filename = data.filename;
    state.width = data.width;
    state.height = data.height;
    state.rawFrames = data.frames.map(f => ({ ...f, selected: true }));

    // Switch to Stage 1
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('stage-1-section').classList.remove('hidden');
    
    renderStage1();
  } catch (err) {
    alert(`錯誤：${err.message}`);
    location.reload();
  }
}

// --- STAGE 1: Render & Selection Logic ---
function renderStage1() {
  const grid = document.getElementById('frames-grid');
  grid.innerHTML = '';

  document.getElementById('gif-meta-info').textContent = 
    `檔案名：${state.filename} | 原圖尺寸：${state.width} x ${state.height} px | 總影格數量：${state.rawFrames.length} 幀`;

  state.rawFrames.forEach((frame) => {
    const card = document.createElement('div');
    card.className = `frame-card ${frame.selected ? 'selected' : 'excluded'}`;
    card.dataset.index = frame.index;

    card.innerHTML = `
      <div class="frame-badge-topleft">#${frame.index}</div>
      <div class="frame-checkbox"></div>
      <div class="frame-thumb-box">
        <img src="${frame.image}" alt="Frame ${frame.index}" loading="lazy">
      </div>
      <div class="frame-footer">
        <span>間隙時間</span>
        <strong>${frame.duration} ms</strong>
      </div>
    `;

    card.addEventListener('click', () => {
      frame.selected = !frame.selected;
      renderStage1Stats();
      card.className = `frame-card ${frame.selected ? 'selected' : 'excluded'}`;
    });

    grid.appendChild(card);
  });

  renderStage1Stats();
}

function renderStage1Stats() {
  const selectedList = state.rawFrames.filter(f => f.selected);
  const totalDuration = selectedList.reduce((sum, f) => sum + f.duration, 0);

  document.getElementById('selected-count-badge').textContent = 
    `${selectedList.length} / ${state.rawFrames.length}`;
  document.getElementById('total-duration-badge').textContent = `${totalDuration} ms`;
}

function initStage1Controls() {
  document.getElementById('btn-select-all').addEventListener('click', () => {
    state.rawFrames.forEach(f => f.selected = true);
    renderStage1();
  });

  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    state.rawFrames.forEach(f => f.selected = false);
    renderStage1();
  });

  document.getElementById('btn-invert-selection').addEventListener('click', () => {
    state.rawFrames.forEach(f => f.selected = !f.selected);
    renderStage1();
  });

  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    state.rawFrames.forEach(f => {
      if (f.selected) f.selected = false;
    });
    renderStage1();
  });

  document.getElementById('btn-goto-stage-2').addEventListener('click', () => {
    const selected = state.rawFrames.filter(f => f.selected);
    if (selected.length === 0) {
      alert('請至少選擇保留 1 幀影格才能進入第二階段！');
      return;
    }
    state.selectedFrames = selected;

    // Switch step indicator & view
    setStepActive(2);
    document.getElementById('stage-1-section').classList.add('hidden');
    document.getElementById('stage-2-section').classList.remove('hidden');
    resetStage2UI();
  });
}

// --- STAGE 2: U2-Net Controls ---
function initStage2Controls() {
  const choiceYes = document.getElementById('choice-rembg-yes');
  const choiceNo = document.getElementById('choice-rembg-no');
  const settingsBlock = document.getElementById('rembg-settings-block');

  choiceYes.addEventListener('click', () => {
    choiceYes.classList.add('active');
    choiceNo.classList.remove('active');
    choiceYes.querySelector('input').checked = true;
    state.useRembg = true;
    if (settingsBlock) settingsBlock.classList.remove('hidden');
  });

  choiceNo.addEventListener('click', () => {
    choiceNo.classList.add('active');
    choiceYes.classList.remove('active');
    choiceNo.querySelector('input').checked = true;
    state.useRembg = false;
    if (settingsBlock) settingsBlock.classList.add('hidden');
  });

  // Range Slider & Checkbox Event Listeners
  const cutoffInput = document.getElementById('rembg-cutoff');
  const cutoffVal = document.getElementById('rembg-cutoff-val');
  if (cutoffInput && cutoffVal) {
    cutoffInput.addEventListener('input', (e) => {
      cutoffVal.textContent = e.target.value;
    });
  }

  const fgInput = document.getElementById('rembg-fg-threshold');
  const fgVal = document.getElementById('rembg-fg-val');
  if (fgInput && fgVal) {
    fgInput.addEventListener('input', (e) => {
      fgVal.textContent = e.target.value;
    });
  }

  const alphaMattingCheckbox = document.getElementById('rembg-alpha-matting');
  const alphaMattingSubgroup = document.getElementById('alpha-matting-subgroup');
  if (alphaMattingCheckbox && alphaMattingSubgroup) {
    alphaMattingCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        alphaMattingSubgroup.classList.remove('hidden');
      } else {
        alphaMattingSubgroup.classList.add('hidden');
      }
    });
  }

  document.getElementById('btn-back-to-stage-1').addEventListener('click', () => {
    setStepActive(1);
    document.getElementById('stage-2-section').classList.add('hidden');
    document.getElementById('stage-1-section').classList.remove('hidden');
  });

  // 🚀 Main action button (Start AI / Direct Proceed)
  document.getElementById('btn-start-stage-2').addEventListener('click', async () => {
    if (!state.useRembg) {
      // Direct pass to stage 3 without rembg
      state.rembgFrames = [...state.selectedFrames];
      gotoStage3();
      return;
    }

    // If AI background removal has already run or frames exist, proceed directly to Stage 3 (preserving manual edits!)
    if (state.rembgFrames && state.rembgFrames.length > 0) {
      gotoStage3();
      return;
    }

    // Otherwise run AI background removal for the first time
    await runRembgProcess();
  });

  // 🔄 Reprocess button (explicitly re-run AI background removal)
  const reprocessBtn = document.getElementById('btn-reprocess-rembg');
  if (reprocessBtn) {
    reprocessBtn.addEventListener('click', async () => {
      const hasEdits = state.rembgFrames && state.rembgFrames.some(f => f.edited);
      if (hasEdits) {
        const confirmClear = confirm('⚠️ 您手動微調過的部分影格將被重新 AI 去背覆蓋，確定要重新執行嗎？');
        if (!confirmClear) return;
      }
      await runRembgProcess();
    });
  }
}

async function runRembgProcess() {
  // Read configured Rembg parameters
  const selectedModel = document.getElementById('rembg-model').value || 'u2net';
  const alphaCutoff = parseInt(document.getElementById('rembg-cutoff').value) || 10;
  const postProcessMask = document.getElementById('rembg-post-process').checked;
  const alphaMatting = document.getElementById('rembg-alpha-matting').checked;
  const fgThreshold = parseInt(document.getElementById('rembg-fg-threshold').value) || 200;

  // Run U2-Net background removal
  const progressArea = document.getElementById('rembg-progress-area');
  const statusText = document.getElementById('rembg-status-text');
  const progressFill = document.getElementById('rembg-progress-fill');
  const startBtn = document.getElementById('btn-start-stage-2');

  progressArea.classList.remove('hidden');
  if (startBtn) startBtn.disabled = true;
  progressFill.style.width = '30%';
  statusText.textContent = `正在使用 AI 模型 (${selectedModel}) 處理 ${state.selectedFrames.length} 幀圖像...`;

  try {
    const res = await fetch('/api/u2net-rembg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frames: state.selectedFrames.map(f => ({
          index: f.index,
          duration: f.duration,
          image: f.image
        })),
        model: selectedModel,
        alpha_cutoff: alphaCutoff,
        post_process_mask: postProcessMask,
        alpha_matting: alphaMatting,
        alpha_matting_foreground_threshold: fgThreshold
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'U2-Net 去背處理失敗');
    }

    progressFill.style.width = '90%';
    statusText.textContent = '去背完成，正在優化圖層...';

    const data = await res.json();
    state.rembgFrames = data.frames;

    progressFill.style.width = '100%';
    statusText.textContent = '✅ 所有影格去背完成！';

    // Render U2-Net previews & update button labels
    renderRembgPreviews();

    setTimeout(() => {
      gotoStage3();
    }, 800);

  } catch (err) {
    alert(`去背處理失敗：${err.message}`);
    progressArea.classList.add('hidden');
  } finally {
    if (startBtn) startBtn.disabled = false;
  }
}

function updateStage2FooterButtons() {
  const startBtn = document.getElementById('btn-start-stage-2');
  const reprocessBtn = document.getElementById('btn-reprocess-rembg');

  if (state.rembgFrames && state.rembgFrames.length > 0) {
    if (reprocessBtn) reprocessBtn.classList.remove('hidden');
    if (startBtn) {
      const hasEdits = state.rembgFrames.some(f => f.edited);
      startBtn.textContent = hasEdits ? '🚀 套用微調成果並進入第三階段 →' : '🚀 直接進入第三階段 →';
      startBtn.className = 'btn btn-success';
    }
  } else {
    if (reprocessBtn) reprocessBtn.classList.add('hidden');
    if (startBtn) {
      startBtn.textContent = '✨ 開始處理 / 進入第三階段 →';
      startBtn.className = 'btn btn-primary';
    }
  }
}

function resetStage2UI() {
  const startBtn = document.getElementById('btn-start-stage-2');
  if (startBtn) {
    startBtn.disabled = false;
  }
  const progressArea = document.getElementById('rembg-progress-area');
  if (progressArea) {
    progressArea.classList.add('hidden');
  }
  updateStage2FooterButtons();
}

function renderRembgPreviews() {
  const container = document.getElementById('rembg-preview-container');
  const grid = document.getElementById('rembg-preview-grid');
  container.classList.remove('hidden');
  grid.innerHTML = '';

  state.rembgFrames.forEach((f, idx) => {
    const card = document.createElement('div');
    card.className = `frame-card selected ${f.edited ? 'frame-edited' : ''}`;
    card.innerHTML = `
      <div class="frame-badge-topleft">#${f.index}</div>
      ${f.edited ? '<div class="frame-badge-edited">✨ 已微調</div>' : ''}
      <div class="frame-thumb-box">
        <img src="${f.image}" alt="Rembg frame ${f.index}">
      </div>
      <div class="frame-footer">
        <span>${f.edited ? '已微調' : '已去背'}</span>
        <strong>${f.duration} ms</strong>
      </div>
      <div class="frame-card-actions">
        <button class="btn btn-sm btn-secondary btn-export-frame" title="導出此影格圖檔 (PNG) 至電腦微調">⬇️ 導出</button>
        <label class="btn btn-sm btn-primary btn-import-label" title="上傳微調後的 PNG 替換此影格">
          ⬆️ 替換
          <input type="file" accept="image/png, image/webp" class="btn-import-file" style="display:none;">
        </label>
        ${f.edited ? '<button class="btn btn-sm btn-danger btn-reset-frame" title="重置為原始 AI 去背成果">↺ 復原</button>' : ''}
      </div>
    `;

    // ⬇️ Export single frame PNG handler
    const exportBtn = card.querySelector('.btn-export-frame');
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = f.image;
      const cleanFilename = state.filename ? state.filename.replace(/\.[^/.]+$/, "") : "frame";
      a.download = `${cleanFilename}_frame_${String(f.index).padStart(2, '0')}.png`;
      a.click();
    });

    // ⬆️ Import / Replace single frame PNG handler
    const fileInput = card.querySelector('.btn-import-file');
    fileInput.addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (!f.originalImage) {
            f.originalImage = f.image;
          }
          f.image = evt.target.result;
          f.edited = true;
          renderRembgPreviews();
        };
        reader.readAsDataURL(file);
      }
    });

    // ↺ Reset single frame handler
    const resetBtn = card.querySelector('.btn-reset-frame');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (f.originalImage) {
          f.image = f.originalImage;
          f.edited = false;
          renderRembgPreviews();
        }
      });
    }

    grid.appendChild(card);
  });

  updateStage2FooterButtons();
}

function gotoStage3() {
  setStepActive(3);
  document.getElementById('stage-2-section').classList.add('hidden');
  document.getElementById('stage-3-section').classList.remove('hidden');

  // Ensure Stage 2 UI controls are reset if user navigates back
  resetStage2UI();

  // Default columns to total frame count (all frames in horizontal line)
  if (state.rembgFrames && state.rembgFrames.length > 0) {
    document.getElementById('ss-cols').value = state.rembgFrames.length;
  }
}

// --- STAGE 3: Synthesis & Export Controls ---
function initStage3Controls() {
  document.getElementById('btn-back-to-stage-2').addEventListener('click', () => {
    setStepActive(2);
    document.getElementById('stage-3-section').classList.add('hidden');
    document.getElementById('stage-2-section').classList.remove('hidden');
    resetStage2UI();
  });

  const handleReturnHome = () => {
    location.reload();
  };

  const btnResetHome = document.getElementById('btn-reset-home');
  if (btnResetHome) btnResetHome.addEventListener('click', handleReturnHome);

  const btnHomeTop = document.getElementById('btn-home-top');
  if (btnHomeTop) btnHomeTop.addEventListener('click', handleReturnHome);

  const updateExportOptionsVisibility = () => {
    const selectedTypes = Array.from(document.querySelectorAll('input[name="export-type"]:checked')).map(el => el.value);
    const gifBlock = document.getElementById('gif-options-block');
    const webpBlock = document.getElementById('webp-options-block');
    const ssBlock = document.getElementById('spritesheet-options-block');

    if (gifBlock) gifBlock.classList.toggle('hidden', !selectedTypes.includes('gif'));
    if (webpBlock) webpBlock.classList.toggle('hidden', !selectedTypes.includes('webp'));
    if (ssBlock) ssBlock.classList.toggle('hidden', !selectedTypes.includes('spritesheet'));
  };

  document.querySelectorAll('input[name="export-type"]').forEach(cb => {
    cb.addEventListener('change', updateExportOptionsVisibility);
  });
  updateExportOptionsVisibility();

  document.getElementById('btn-generate').addEventListener('click', async () => {
    const exportTypes = Array.from(document.querySelectorAll('input[name="export-type"]:checked')).map(el => el.value);
    if (exportTypes.length === 0) {
      alert('請至少選擇一種導出格式！');
      return;
    }

    const gifFpsOverride = parseFloat(document.getElementById('gif-fps').value) || null;
    const gifLoop = parseInt(document.getElementById('gif-loop').value) || 0;

    const webpFpsOverride = parseFloat(document.getElementById('webp-fps').value) || null;
    const webpLoop = parseInt(document.getElementById('webp-loop').value) || 0;
    const webpLossless = document.getElementById('webp-lossless').checked;

    const ssCols = parseInt(document.getElementById('ss-cols').value) || 5;
    const ssPadding = parseInt(document.getElementById('ss-padding').value) || 2;
    const ssTransparent = document.getElementById('ss-transparent').checked;

    const payload = {
      frames: state.rembgFrames,
      export_types: exportTypes,
      gif_options: {
        fps_override: gifFpsOverride,
        loop: gifLoop
      },
      webp_options: {
        fps_override: webpFpsOverride,
        loop: webpLoop,
        lossless: webpLossless
      },
      spritesheet_options: {
        columns: ssCols,
        padding: ssPadding,
        transparent_bg: ssTransparent
      }
    };

    const loading = document.getElementById('synthesis-loading');
    const resultsDisplay = document.getElementById('results-display');
    const genBtn = document.getElementById('btn-generate');

    loading.classList.remove('hidden');
    resultsDisplay.classList.add('hidden');
    genBtn.disabled = true;

    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '合成導出失敗');
      }

      const data = await res.json();
      state.synthesisResult = data;

      renderSynthesisResults(data);
    } catch (err) {
      alert(`合成失敗：${err.message}`);
    } finally {
      loading.classList.add('hidden');
      genBtn.disabled = false;
    }
  });
}

function renderSynthesisResults(data) {
  const resultsDisplay = document.getElementById('results-display');
  const gifBlock = document.getElementById('result-gif-block');
  const webpBlock = document.getElementById('result-webp-block');
  const ssBlock = document.getElementById('result-ss-block');

  resultsDisplay.classList.remove('hidden');

  const baseName = state.filename ? state.filename.replace(/\.[^/.]+$/, "") : "output";

  // 1. GIF Result
  if (data.gif) {
    gifBlock.classList.remove('hidden');
    document.getElementById('res-gif-img').src = data.gif.data_url;
    document.getElementById('res-gif-meta').textContent = 
      `總幀數: ${data.gif.total_frames} | 檔案大小: ${(data.gif.size_bytes / 1024).toFixed(1)} KB`;

    const downloadBtn = document.getElementById('download-gif-btn');
    downloadBtn.href = data.gif.data_url;
    downloadBtn.download = `${baseName}_new.gif`;
  } else {
    gifBlock.classList.add('hidden');
  }

  // 2. WebP Result
  if (data.webp) {
    webpBlock.classList.remove('hidden');
    document.getElementById('res-webp-img').src = data.webp.data_url;
    document.getElementById('res-webp-meta').textContent = 
      `總幀數: ${data.webp.total_frames} | 檔案大小: ${(data.webp.size_bytes / 1024).toFixed(1)} KB`;

    const downloadWebpBtn = document.getElementById('download-webp-btn');
    downloadWebpBtn.href = data.webp.data_url;
    downloadWebpBtn.download = `${baseName}_animated.webp`;
  } else {
    webpBlock.classList.add('hidden');
  }

  // 3. Sprite Sheet Result
  if (data.spritesheet) {
    ssBlock.classList.remove('hidden');
    document.getElementById('res-ss-img').src = data.spritesheet.data_url;
    document.getElementById('res-ss-meta').textContent = 
      `尺寸: ${data.spritesheet.width} x ${data.spritesheet.height} px | 排列: ${data.spritesheet.columns} 欄 x ${data.spritesheet.rows} 列`;

    const downloadSsBtn = document.getElementById('download-ss-btn');
    downloadSsBtn.href = data.spritesheet.data_url;
    downloadSsBtn.download = `${baseName}_spritesheet.png`;

    const downloadJsonBtn = document.getElementById('download-json-btn');
    downloadJsonBtn.onclick = () => {
      const jsonStr = JSON.stringify(data.spritesheet.meta, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_spritesheet.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
  } else {
    ssBlock.classList.add('hidden');
  }
}

function setStepActive(stepNum) {
  for (let i = 1; i <= 3; i++) {
    const navItem = document.getElementById(`step-nav-${i}`);
    if (i === stepNum) {
      navItem.classList.add('active');
    } else {
      navItem.classList.remove('active');
    }
  }
}
