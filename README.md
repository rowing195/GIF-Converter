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

**GIF Converter** 是一個具備現代暗黑視覺介面的動畫與圖層處理工具，同時支援**動圖逐幀處理**與**靜態圖單張去背**。

**動圖流程（.gif / 動態 .webp）** 分為三個階段：第一階段逐幀拆解並顯示每幀延遲時間（ms），以一排 5 張的網格供你挑選要保留的影格；第二階段選擇是否送入 AI 模型去背；第三階段將成果合成為新 GIF、動態 WebP 或 Sprite Sheet 精靈圖（可複選）。

**靜態圖流程（.png / .jpg / .bmp）** 則在第二階段完成即結束，直接下載透明背景 PNG，不會進入合成階段。

---

## 🎨 Features

- 🎬 **第一階段：逐幀拆解 (Decomposition)**
  - 解析 GIF / WebP 檔，提取每一幀圖像數據與 `duration` 延遲時間（ms）。
  - **一排 5 張圖** 的網格佈局，每張卡片**左上角帶有顯目的編號角標**（`#0`, `#1`, `#2` ...）。
  - 全選、取消全選、反向選擇、批量刪除影格等高效操作。
  - 即時統計保留影格數與動畫總時長。

- ✨ **第二階段：AI 智慧去背 (Background Removal)**
  - **六種模型可切換**：`U2-Net`（通用預設）、`IS-Net Anime`（二次元專用，可避免服裝被挖空）、`U2-Net Human Seg`（人像肢體）、`U2-Netp`（輕量柔和）、`Silueta`（輪廓外框）、`IS-Net General`（高精細分割）。
  - 可調整邊緣閥值、內部孔洞修補 (Post-Process Mask)、Alpha Matting 精細邊緣與前景自信門檻。
  - **單幀手動微調**：去背結果可逐幀導出 PNG 至繪圖軟體修改後再傳回替換，並可隨時復原。
  - 可換模型或改參數**重新執行去背**，反覆比較結果。

- 🚀 **第三階段：合成與導出 (Synthesis & Export)**（僅動圖）
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
    └── script.js              # 前端控制邏輯與 API 溝通
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
| `/api/u2net-rembg` | `POST` | 傳送已選影格至指定 AI 模型，回傳去背後的透明 PNG 影格 |
| `/api/synthesize` | `POST` | 依 `export_types` 合成導出 GIF、動態 WebP 與 Sprite Sheet 精靈圖 |

---

## 📜 License

This project is open-source and free to use under the MIT License.

<div align="right">

[![][back-to-top]](#top)

</div>

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
