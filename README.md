<div id="top"></div>

<!-- HEADER STYLE: CLASSIC -->
<div align="center">

<h1><code>GIF Converter</code></h1>

<em>逐幀拆解 • AI 智慧去背 • GIF / WebP / Sprite Sheet 導出工具</em>

<!-- BADGES -->
<br>

<img src="https://img.shields.io/badge/Python-3776AB.svg?style=for-the-badge&logo=Python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/FastAPI-009688.svg?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI">
<img src="https://img.shields.io/badge/Pillow-111111.svg?style=for-the-badge&logo=Python&logoColor=white" alt="Pillow">
<img src="https://img.shields.io/badge/rembg-ONNX-6366F1.svg?style=for-the-badge&logo=OpenAI&logoColor=white" alt="rembg ONNX">
<img src="https://img.shields.io/badge/HTML5-E34F26.svg?style=for-the-badge&logo=HTML5&logoColor=white" alt="HTML5">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=for-the-badge&logo=JavaScript&logoColor=black" alt="JavaScript">

<br><br>

<a href="https://github.com/rowing195/GIF-Converter/releases/latest">
  <img src="https://img.shields.io/badge/⬇️_下載_Windows_免安裝版-6366F1.svg?style=for-the-badge" alt="Download">
</a>

</div>

<br>

---

## 📖 Table of Contents

- [Table of Contents](#-table-of-contents)
- [Download](#-download)
- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Usage](#usage)
    - [Testing](#testing)
- [Building the EXE](#-building-the-exe)
- [API Reference](#-api-reference)
- [License](#-license)

---

## ⬇️ Download

**[前往 Releases 下載最新版本 →](https://github.com/rowing195/GIF-Converter/releases/latest)**

下載 `GIFConverter.zip`，解壓縮後執行 `GIFConverter.exe`，瀏覽器會自動開啟操作介面。

不需要安裝 Python，也不需要另外安裝任何套件。

| | |
| :--- | :--- |
| 平台 | Windows 64 位元 |
| 壓縮檔 | 約 310 MB |
| 解壓後 | 約 540 MB（含內建 AI 模型與推論引擎）|
| 網路 | 內建 U2-Net 模型可離線使用；其他模型首次選用時自動下載 |

> 圖片全程在本機處理，不會上傳到任何伺服器。

---

## 🌌 Overview

**GIF Converter** 是一個像剪輯軟體的動畫去背工具，同時支援**動圖逐幀處理**與**靜態圖單張去背**。

介面是**單一工作區**：中間放大檢視目前這一幀，下方時間軸依每幀時長排列，右側是屬性面板。上方的**拆解 / 去背 / 導出**三個模式共用同一個畫面，切換時只換中間內容與面板，不會離開工作區。

**動圖（.gif / 動態 .webp）** 走完整流程：拆解挑影格 → AI 去背 → 導出 GIF、動態 WebP 或 Sprite Sheet（可複選）。
**靜態圖（.png / .jpg / .bmp）** 直接進入去背模式，不顯示時間軸，完成後下載透明背景 PNG。
**Sprite Sheet** 也當靜態圖開啟，在去背模式按「切割成動畫影格」，切成逐幀後就跟動圖走同一套流程。

---

## 🎨 Features

- ✂️ **切割模式**（Sprite Sheet）
  - 開啟靜態圖時會自動偵測格子；偵測到 4 格以上會提示這可能是 Sprite Sheet。
  - **自動偵測**適用格子大小不一的 AI Sprite Sheet（有底色間隔的 Panel，或透明背景上的角色），角色旁分離的小物件（汗滴、Zzz）會歸到最近的那一格；**規則網格**則依列數 × 欄數等分。
  - 框可以直接在圖上拖曳移動、拖曳角落調整大小、在空白處拖曳新增，選取後按 <kbd>Delete</kbd> 刪除；編號依位置由上而下、由左而右排列。
  - 設定影格率後一鍵切割：所有格子放進同一尺寸（最大那格）的畫布、靠底部置中，空白處補上該格的邊緣色（透明圖則保持透明）。可以直接進入導出模式，或先進行對齊校正。

- 🎬 **拆解模式**
  - 解析 GIF / WebP，時間軸依每幀 `duration`（ms）等比例排列，停頓較久的影格會比較寬。
  - 點影格右上角的勾選框切換保留或略過，略過的影格會加上斜線；也可全選、全不選、反選。
  - 鍵盤 <kbd>←</kbd> <kbd>→</kbd> 切換影格、<kbd>空白鍵</kbd> 切換保留；播放時會自動跳過略過的影格。
  - 任一幀都可以**單獨導出 PNG**，不必先去背（適合本來就是透明背景的 GIF）。

- ✨ **去背模式**
  - **六種模型可切換**：`U2-Net`（通用，已內建可離線使用）、`IS-Net Anime`（二次元專用，可避免服裝被挖空）、`U2-Net Human Seg`（人像肢體）、`U2-Netp`（輕量柔和）、`Silueta`（輪廓外框）、`IS-Net General`（高精細分割）。
  - 可調整邊緣閥值、內部孔洞修補 (Post-Process Mask)、Alpha Matting 與前景門檻。
  - **處理範圍**可選已保留的全部影格，或只處理目前這一幀。
  - **逐幀進度**：處理中可看到已完成幾幀、哪一幀正在處理。
  - 去背結果**逐幀保存**：之後補選影格時只會處理新增的那幾幀。
  - **單幀手動微調**：導出 PNG 到繪圖軟體修好後再替換回來，隨時可復原；畫布右下可切換原始／去背後對照。
  - 模型下載失敗會說明原因並提供「改用 U2-Net」；個別影格失敗會在時間軸標紅，可只重試失敗的幀。

- 🎯 **對齊模式**（Sprite Sheet）
  - 自動找出每一幀的角色範圍（有透明就看 Alpha，否則看背景色），把角色的**對齊點**（底部、中心或頂部）放到同一個位置，消除 AI 圖常見的漂移與上下跳動。
  - **縮放校正**：依參考幀的角色高度（或寬度）縮放每一幀，但限制最大差異（預設 ±5%），避免蹲下、伸手的影格被誤放大。
  - 畫布自動容納所有影格，可調整四周留白；畫面上直接拖曳可微調單一幀的位置，**洋蔥皮**會疊上前一幀方便比對。
  - 對齊只記錄參數、不改動原圖：之後重新去背，進入對齊或導出時會自動重算；也可以關閉「導出時套用對齊」回到原樣。

- 🚀 **導出模式**（僅動圖）
  - 畫布顯示**輸出動畫預覽**與 **Sprite Sheet 版面預覽**（含實際輸出尺寸）。
  - **導出格式可複選**，一次產出多種成品：
    - **GIF 動畫**：自訂影格率 (FPS Override) 與 Loop 循環次數。
    - **動態 WebP**：自訂影格率、循環次數與無損壓縮（保留精準 Alpha 通道）。
    - **Sprite Sheet 精靈圖**：自訂欄數、間距與背景透明度，並附 JSON Layout 座標數據。

---

## 📁 Project Structure

```sh
gif_converter/
├── app.py                     # FastAPI 後端 API (拆解, rembg 去背, 合成導出)
├── launcher.py                # 打包版進入點 (植入內建模型、選埠、開瀏覽器)
├── gif_converter.spec         # PyInstaller 打包設定
├── build_exe.bat              # 一鍵打包腳本
├── requirements.txt           # 執行環境依賴
├── start.bat                  # 一鍵啟動腳本 (開發用)
├── create_sample_gif.py       # 測試用 GIF 生成腳本
├── test_agent_api.py          # API 自動化測試腳本
├── sample.gif                 # 範例測試 GIF 檔
├── README.md                  # 專案說明文件
└── static/
    ├── index.html             # 嚮導式 Modern Web 介面
    ├── style.css              # 現代暗黑科技風格 CSS
    ├── script.js              # 前端控制邏輯與 API 溝通
    ├── slice.js               # Sprite Sheet 切割模式
    └── align.js               # 對齊模式（Anchor、縮放校正、洋蔥皮）
```

---

## 🛠️ Getting Started

> 只是想使用工具的話，請直接前往 [Download](#-download) 下載免安裝版。以下是從原始碼執行的方式。

### Prerequisites

- **Python Version:** Python 3.10+（已在 Python 3.13 測試無誤）

### Installation

1. **取得專案：**

    ```sh
    git clone https://github.com/rowing195/GIF-Converter.git
    cd GIF-Converter
    ```

2. **安裝所需依賴套件：**

    ```sh
    pip install -r requirements.txt
    ```

### Usage

1. **啟動 FastAPI 後端服務器（預設 Port: 8080）：**

    ```sh
    python app.py
    ```
    *或在 Windows 直接雙擊 `start.bat` 即可一鍵啟動並開啟頁面。*

2. **開啟瀏覽器存取介面：**

    造訪 [http://127.0.0.1:8080](http://127.0.0.1:8080)

### Testing

執行 API 端點自動化測試腳本：

```sh
python test_agent_api.py
```

---

## 📦 Building the EXE

在 Windows 上執行：

```sh
build_exe.bat
```

會產出 `dist/GIFConverter/`（資料夾版）與 `dist/GIFConverter.zip`（散布用）。

打包前請**先執行過一次 AI 去背**，讓 `rembg` 將 `u2net.onnx` 下載到 `~/.u2net`——打包腳本會把該模型內建進成品，使其開箱即可離線使用。

> 打包設定針對 conda 環境做了兩項修正：補進 `Library/bin` 中的 DLL，並將 MSVC 執行期替換為系統版本（conda 的 14.27 會導致 onnxruntime 的 DLL 初始化失敗）。

---

## 🔌 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/decompose-gif` | `POST` | 上傳動圖或靜態圖，回傳逐幀 base64 數據、尺寸、每幀 `duration` (ms) 與 `is_animated` |
| `/api/u2net-rembg` | `POST` | 傳送影格至指定 AI 模型，回傳去背後的透明 PNG 影格。單幀失敗時會沿用原圖並標記 `failed`，同時回傳 `failed_count` |
| `/api/detect-panels` | `POST` | 傳入 Sprite Sheet 圖片，回傳偵測到的影格框 `{x, y, w, h}`（未排序） |
| `/api/slice-sheet` | `POST` | 依影格框切割 Sprite Sheet，統一畫布尺寸並靠底部置中，回傳格式與 `/api/decompose-gif` 的 `frames` 相同 |
| `/api/content-boxes` | `POST` | 傳入多張影格，回傳每張的角色範圍 `box` 與背景色 `background`（透明圖為 `null`），供對齊模式使用 |
| `/api/synthesize` | `POST` | 依 `export_types` 合成導出 GIF、動態 WebP 與 Sprite Sheet 精靈圖 |

`/api/u2net-rembg` 模型載入失敗時，`detail` 會回傳 `{code, model, message}`，`code` 為下列其中一種：

| Code | 意義 |
| :--- | :--- |
| `model_download_failed` | 模型尚未下載，且目前連不上網路 |
| `unknown_model` | 模型名稱不存在 |
| `model_load_failed` | 其他模型載入問題（例如檔案損毀） |
| `rembg_missing` | rembg 套件本身無法載入 |

> 前端一律要求瀏覽器重新驗證頁面與靜態檔（`Cache-Control: no-cache`），避免升級後出現新頁面配舊樣式表。API 回應不受影響。

---

## 📜 License

This project is open-source and free to use under the MIT License.

<div align="right">

[![][back-to-top]](#top)

</div>

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
