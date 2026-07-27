<div id="top"></div>

<!-- HEADER STYLE: CLASSIC -->
<div align="center">

<h1><code>GIF Converter</code></h1>

<em>逐幀拆解 • U2-Net AI 去背 • 智慧 GIF / Sprite Sheet 導出工具</em>

<!-- BADGES -->
<br>

<img src="https://img.shields.io/badge/Python-3776AB.svg?style=for-the-badge&logo=Python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/FastAPI-009688.svg?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI">
<img src="https://img.shields.io/badge/Pillow-111111.svg?style=for-the-badge&logo=Python&logoColor=white" alt="Pillow">
<img src="https://img.shields.io/badge/U2--Net-RemBG-6366F1.svg?style=for-the-badge&logo=OpenAI&logoColor=white" alt="U2Net RemBG">
<img src="https://img.shields.io/badge/HTML5-E34F26.svg?style=for-the-badge&logo=HTML5&logoColor=white" alt="HTML5">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=for-the-badge&logo=JavaScript&logoColor=black" alt="JavaScript">

</div>

<br>

---

## 📖 Table of Contents

- [Table of Contents](#-table-of-contents)
- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Usage](#usage)
    - [Testing](#testing)
- [API Reference](#-api-reference)
- [License](#-license)

---

## 🌌 Overview

**GIF Converter** 是一個強大且具備現代暗黑視覺介面的 GIF 動畫與圖層處理工具。它能幫你將 GIF 做精準的逐幀拆解、展示每幀的延遲時間（ms），並提供 **一排 5 張圖** 的視覺化網格選單（左上角標有影格編號）。

使用者可在第一階段自訂剔除或留下的影格，在第二階段選擇是否傳送到 **U2-Net AI 模型** 進行自動去背（生成 Alpha 透明通道 PNG），並在第三階段將成果合成**新 GIF**、導出 **Sprite Sheet 精靈圖** 或**兩者皆做**。

---

## 🎨 Features

- 🎬 **第一階段：逐幀拆解 (Decomposition)**
  - 解析 GIF / WebP 檔，提取每一幀圖像數據與 `duration` 延遲時間（ms）。
  - **一排 5 張圖** 的網格佈局，每張卡片**左上角帶有顯目的編號角標**（`#0`, `#1`, `#2` ...）。
  - 全選、取消全選、反向選擇、批量刪除影格等高效操作。
  - 即時統計保留影格數與動畫總時長。

- ✨ **第二階段：U2-Net AI 去背 (Background Removal)**
  - 雙重模式切換：`進行 U2-Net 去背` 或是 `跳過直接進入第三階段`。
  - 使用 `rembg` (U2-Net 深度學習模型)，自動切割前景主體並產生透明 PNG。
  - 去背進度條與去背後 5 欄對比預覽。

- 🚀 **第三階段：合成與導出 (Synthesis & Export)**
  - **新 GIF**：自訂影格率 (FPS Override) 與 Loop 循環次數。
  - **Sprite Sheet (精靈圖)**：自訂欄數 (Columns, 預設 5 欄)、間距 (Padding) 與背景透明度，提供 Sprite Sheet PNG 及 JSON Layout 座標數據下載。
  - **兩者皆做 (Both)**：一鍵生成新 GIF 與 Sprite Sheet。

---

## 📁 Project Structure

```sh
gif_converter_agent/
├── app.py                     # FastAPI 後端 API (GIF 拆解, Rembg U2-Net, 合成導出)
├── create_sample_gif.py       # 測試用 GIF 生成腳本
├── test_agent_api.py          # API 自動化測試腳本
├── start.bat                  # 一鍵啟動腳本
├── sample.gif                 # 範例測試 GIF 檔
├── README.md                  # 專案說明文件
└── static/
    ├── index.html             # 3 階段嚮導式 Modern Web 介面
    ├── style.css              # 現代暗黑科技風格 CSS (5-Column Grid Layout)
    └── script.js              # 前端控制邏輯與 API 溝通
```

---

## 🛠️ Getting Started

### Prerequisites

- **Python Version:** Python 3.10+ (已在 Python 3.13 測試無誤)
- **Dependencies:** `fastapi`, `uvicorn`, `pillow`, `rembg`, `onnxruntime`, `requests`

### Installation

1. **進入專案目錄：**

    ```sh
    cd C:\Users\Watson\.gemini\antigravity\scratch\gif_converter_agent
    ```

2. **安裝所需依賴套件：**

    ```sh
    pip install fastapi uvicorn rembg pillow numpy python-multipart onnxruntime requests
    ```

### Usage

1. **啟動 FastAPI 後端服務器（預設 Port: 8080）：**

    ```sh
    python app.py
    ```
    *或在 Windows 直接雙擊 [start.bat](file:///C:/Users/Watson/.gemini/antigravity/scratch/gif_converter_agent/start.bat) 即可一鍵啟動並開啟頁面。*

2. **開啟瀏覽器存取介面：**

    造訪 [http://127.0.0.1:8080](http://127.0.0.1:8080)

### Testing

執行 API 端點自動化測試腳本：

```sh
python test_agent_api.py
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/decompose-gif` | `POST` | 上傳 GIF 檔，回傳逐幀 base64 數據、尺寸與每幀 `duration` (ms) |
| `/api/u2net-rembg` | `POST` | 傳送已選影格至 U2-Net 模型，回傳去背後的透明 PNG 影格 |
| `/api/synthesize` | `POST` | 合成導出新 GIF、Sprite Sheet 精靈圖或兩者皆做 |

---

## 📜 License

This project is open-source and free to use under the MIT License.

<div align="right">

[![][back-to-top]](#top)

</div>

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
