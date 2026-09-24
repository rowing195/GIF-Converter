<div align="center" id="top">

<!-- HEADER STYLE: CLASSIC -->

# GIF Converter

<em>把任何動圖變成乾淨透明的動畫素材</em>

<!-- BADGES -->
<img src="https://img.shields.io/github/last-commit/rowing195/GIF-Converter?style=flat&logo=git&logoColor=white&color=0080ff" alt="last-commit">
<img src="https://img.shields.io/github/languages/top/rowing195/GIF-Converter?style=flat&color=0080ff" alt="repo-top-language">
<img src="https://img.shields.io/github/languages/count/rowing195/GIF-Converter?style=flat&color=0080ff" alt="repo-language-count">
<img src="https://img.shields.io/github/v/release/rowing195/GIF-Converter?style=flat&logo=github&logoColor=white&color=0080ff" alt="release">

<em>Built with the tools and technologies:</em>

<img src="https://img.shields.io/badge/Python-3776AB.svg?style=flat&logo=python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white" alt="FastAPI">
<img src="https://img.shields.io/badge/Pydantic-E92063.svg?style=flat&logo=pydantic&logoColor=white" alt="Pydantic">
<img src="https://img.shields.io/badge/Pillow-111111.svg?style=flat" alt="Pillow">
<img src="https://img.shields.io/badge/NumPy-013243.svg?style=flat&logo=numpy&logoColor=white" alt="NumPy">
<img src="https://img.shields.io/badge/SciPy-8CAAE6.svg?style=flat&logo=scipy&logoColor=white" alt="SciPy">
<img src="https://img.shields.io/badge/rembg-6366F1.svg?style=flat" alt="rembg">
<img src="https://img.shields.io/badge/ONNX%20Runtime-005CED.svg?style=flat&logo=onnx&logoColor=white" alt="ONNX Runtime">
<br>
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
<img src="https://img.shields.io/badge/HTML5-E34F26.svg?style=flat&logo=html5&logoColor=white" alt="HTML5">
<img src="https://img.shields.io/badge/CSS-663399.svg?style=flat&logo=css&logoColor=white" alt="CSS">

<br><br>

<a href="https://github.com/rowing195/GIF-Converter/releases/latest">
  <img src="https://img.shields.io/badge/⬇️_下載_Windows_免安裝版-6366F1.svg?style=flat" alt="Download">
</a>

</div>
<br>

---

### Table of Contents

- [Download](#download)
- [Overview](#overview)
- [Features](#features)
    - [Modes](#modes)
- [Project Structure](#project-structure)
    - [Project Index](#project-index)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Usage](#usage)
    - [Testing](#testing)
- [Building the EXE](#building-the-exe)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Download

**[前往 Releases 下載最新版本 →](https://github.com/rowing195/GIF-Converter/releases/latest)**

下載 `GIFConverter.zip`，解壓縮後執行 `GIFConverter.exe`，瀏覽器會自動開啟操作介面。

不需要安裝 Python，也不需要另外安裝任何套件。

| | |
| :--- | :--- |
| 平台 | Windows 64 位元 |
| 壓縮檔 | 約 310 MB |
| 解壓後 | 約 540 MB（含內建 AI 模型與推論引擎）|
| 網路 | 內建 U2-Net 模型可離線使用；其他模型首次選用時自動下載 |
| 連接埠 | 從 8008 起自動尋找可用的連接埠 |

> 圖片全程在本機處理，不會上傳到任何伺服器。

---

## Overview

GIF Converter 是在本機執行的動畫素材工具：把 GIF、動態 WebP 或 AI 產生的 Sprite Sheet 拆成逐幀，用 AI 去背、校正角色位置，再導出成 GIF、WebP 或 Sprite Sheet。

**Why GIF Converter?**

本專案的目標，是讓「一張動圖 → 可以直接放進遊戲或網頁的透明動畫」在同一個畫面內完成。核心特色包括：

- **🎞️ 剪輯台式工作區：** 切割、拆解、去背、對齊、導出五個模式共用同一個畫面，時間軸依每幀時長排列，可拖曳指針或用鍵盤切換影格。
- **🧠 六種去背模型：** 內建可離線使用的 U2-Net，另有二次元、人像等模型；逐幀處理、逐幀保存，失敗的影格會標出並可單獨重試。
- **✂️ AI Sprite Sheet 切割：** 自動偵測大小不一的格子並排除編號文字，一鍵切成動畫影格。
- **🎯 角色對齊校正：** 以底部、中心或頂部為對齊點，消除 AI 圖常見的漂移與縮放跳動，支援逐幀微調與復原 / 重做。
- **📦 多格式導出：** GIF、動態 WebP、Sprite Sheet + JSON 可複選，每種格式可各自選擇去背影格或原圖。
- **🔒 全程本機處理：** 服務只綁定 `127.0.0.1`，並提供免安裝的 Windows 版本。

---

## Features

|      | Component | Details |
| :--- | :-------- | :------ |
| ⚙️ | **Architecture** | <ul><li><code>FastAPI</code> 後端（<code>app.py</code>）提供 6 個 JSON API</li><li>原生 JavaScript 單頁工作區，沒有建置步驟</li><li><code>launcher.py</code> + PyInstaller 打包成免安裝 exe</li></ul> |
| 🔩 | **Code Quality** | <ul><li>Pydantic 模型驗證請求（如 <code>Field(gt=0)</code>）</li><li>模型載入失敗回傳結構化的 <code>{code, model, message}</code></li><li>單幀去背失敗以 <code>failed</code> 標記，不靜默略過</li></ul> |
| 📄 | **Documentation** | <ul><li>README 含 API 參考與錯誤代碼表</li><li>介面內建操作提示與快捷鍵說明</li></ul> |
| 🔌 | **Integrations** | <ul><li><code>rembg</code> + <code>onnxruntime</code>：6 種去背模型</li><li><code>Pillow</code>：GIF / WebP 解碼與合成</li><li><code>scipy.ndimage</code>：連通區塊偵測 Sprite Sheet 格子</li></ul> |
| 🧩 | **Modularity** | <ul><li>前端依模式拆成 <code>script.js</code>、<code>slice.js</code>、<code>align.js</code></li><li>後端依流程分為拆解、去背、切割、對齊、合成端點</li></ul> |
| 🧪 | **Testing** | <ul><li><code>test_agent_api.py</code>：拆解 + 合成的 API 冒煙測試</li><li><code>create_sample_gif.py</code> 產生 10 幀測試素材</li><li>尚無 pytest 測試套件</li></ul> |
| ⚡️ | **Performance** | <ul><li>ONNX session 依模型快取，重複去背不重新載入</li><li>去背一幀一個請求，進度是真實完成幀數</li><li>對齊只記錄參數，不改動原圖</li></ul> |
| 🛡️ | **Security** | <ul><li>服務只綁定 <code>127.0.0.1</code></li><li>圖片全程在本機處理</li></ul> |
| 📦 | **Dependencies** | <ul><li><code>requirements.txt</code> 固定版本</li><li>打包版內建 U2-Net 模型與所需的執行期 DLL</li></ul> |

### Modes

- ✂️ **切割模式**（Sprite Sheet）
  - 開啟靜態圖時會自動偵測格子；偵測到 4 格以上會提示這可能是 Sprite Sheet。
  - **自動偵測**適用格子大小不一的 AI Sprite Sheet（有底色間隔的 Panel，或透明背景上的角色），角色旁分離的小物件（汗滴、Zzz）會歸到最近的那一格；**規則網格**則依列數 × 欄數等分。
  - 框可以直接在圖上拖曳移動、拖曳角落調整大小、在空白處拖曳新增，選取後按 <kbd>Delete</kbd> 刪除；編號依位置由上而下、由左而右排列。
  - **調一格、套用全部**：調好一格的邊界後，可以把同樣的調整量套用到其他格（例如一次裁掉每格底下的編號）。每格從目前的位置調整，大小不一的格子也適用，已經手動修好的格子也會保留修正。
  - 偵測會把格子外的編號、說明文字排除；角色描邊把格子從牆到牆切開（例如棉被邊緣）時，會自動接回同一格。
  - 設定影格率後一鍵切割：所有格子放進同一尺寸（最大那格）的畫布、靠底部置中，空白處補上該格的邊緣色（透明圖則保持透明）。可以直接進入導出模式，或先進行對齊校正。

- 🎬 **拆解模式**
  - 解析 GIF / WebP，時間軸依每幀 `duration`（ms）等比例排列，停頓較久的影格會比較寬。
  - 點影格右上角的勾選框切換保留或略過，略過的影格會加上斜線；也可全選、全不選、反選。
  - 拖曳時間軸指針上方的三角形、或用鍵盤 <kbd>←</kbd> <kbd>→</kbd> 切換影格，<kbd>空白鍵</kbd> 切換保留；播放時會自動跳過略過的影格。
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
  - 畫布自動容納所有影格，可調整四周留白；**洋蔥皮**會疊上前一幀方便比對。
  - **逐幀微調**：X / Y 位移、手動縮放（50–150%）與**水平翻轉**（修正 AI 畫反方向的影格），也可以直接在畫面上拖曳。
  - 支援**復原 / 重做**（<kbd>Ctrl</kbd>+<kbd>Z</kbd>、<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>）與快捷鍵：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動（按住 <kbd>Shift</kbd> 一次 10 px）、<kbd>+</kbd> / <kbd>-</kbd> 縮放、<kbd>F</kbd> 翻轉、<kbd>空白鍵</kbd> 播放、<kbd>←</kbd> <kbd>→</kbd> 切換影格。
  - 對齊只記錄參數、不改動原圖：之後重新去背，進入對齊或導出時會自動重算；也可以關閉「導出時套用對齊」回到原樣。

- 🚀 **導出模式**（僅動圖）
  - 畫布顯示**輸出動畫預覽**與 **Sprite Sheet 版面預覽**（含實際輸出尺寸）。
  - 有去背過的影格時，每種格式都可以各自選擇用**去背影格**或**原圖**（例如 GIF 用原圖、Sprite Sheet 用去背），對齊後的位置兩者相同。
  - **導出格式可複選**，一次產出多種成品：
    - **GIF 動畫**：自訂影格率 (FPS Override) 與 Loop 循環次數。
    - **動態 WebP**：自訂影格率、循環次數與無損壓縮（保留精準 Alpha 通道）。
    - **Sprite Sheet 精靈圖**：自訂欄數、間距與背景透明度，並附 JSON Layout 座標數據。

---

## Project Structure

```sh
└── GIF-Converter/
    ├── .gitattributes
    ├── .gitignore
    ├── README.md
    ├── app.py
    ├── build_exe.bat
    ├── create_sample_gif.py
    ├── gif_converter.spec
    ├── launcher.py
    ├── requirements.txt
    ├── sample.gif
    ├── start.bat
    ├── static/
    │   ├── align.js
    │   ├── index.html
    │   ├── script.js
    │   ├── slice.js
    │   └── style.css
    └── test_agent_api.py
```

### Project Index

<details open>
	<summary><b><code>GIF-CONVERTER/</code></b></summary>
	<!-- __root__ Submodule -->
	<details>
		<summary><b>__root__</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ __root__</b></code>
			<table style='width: 100%; border-collapse: collapse;'>
			<thead>
				<tr style='background-color: #f8f9fa;'>
					<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
					<th style='text-align: left; padding: 8px;'>Summary</th>
				</tr>
			</thead>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/app.py'>app.py</a></b></td>
					<td style='padding: 8px;'>- 提供整個工具的 FastAPI 後端。<br>- 把 GIF、WebP 與靜態圖拆成逐幀，以 rembg 逐幀去背並標出失敗的影格，偵測與切割 Sprite Sheet 格子，計算對齊所需的角色範圍，再合成 GIF、WebP 與 Sprite Sheet。<br>- 同時處理打包後的靜態檔路徑，並要求瀏覽器重新驗證前端檔案。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/launcher.py'>launcher.py</a></b></td>
					<td style='padding: 8px;'>- 作為打包版 exe 的進入點。<br>- 首次啟動時把內建的 U2-Net 模型複製到 rembg 的快取目錄，讓工具開箱即可離線使用。<br>- 從 8008 起尋找可用的連接埠，開啟瀏覽器並啟動 uvicorn 服務。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/gif_converter.spec'>gif_converter.spec</a></b></td>
					<td style='padding: 8px;'>- 定義 PyInstaller 的資料夾版打包設定。<br>- 收集 rembg、onnxruntime 等套件的資料檔與動態匯入，並把 U2-Net 模型內建進成品。<br>- 修正 conda 環境的兩個問題：補進 Library/bin 的 DLL，並把過舊的 MSVC 執行期換成系統版本。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/build_exe.bat'>build_exe.bat</a></b></td>
					<td style='padding: 8px;'>- 一鍵打包腳本。<br>- 安裝 PyInstaller，依 gif_converter.spec 產出 dist/GIFConverter/ 資料夾，再壓縮成散布用的 GIFConverter.zip。<br>- 切換 UTF-8 字碼頁，讓中文訊息在 cmd 中正確顯示。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/start.bat'>start.bat</a></b></td>
					<td style='padding: 8px;'>- 從原始碼執行時的一鍵啟動腳本。<br>- 切換 UTF-8 字碼頁後開啟 http://127.0.0.1:8008，並以 python app.py 啟動後端服務，方便不熟悉命令列的使用者直接雙擊執行。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/requirements.txt'>requirements.txt</a></b></td>
					<td style='padding: 8px;'>- 列出執行環境的固定版本依賴：FastAPI、uvicorn、Pillow、NumPy、SciPy，以及 AI 去背所需的 rembg 與 onnxruntime。<br>- 打包才需要的 PyInstaller 以註解列出，不會在一般安裝時裝入。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/create_sample_gif.py'>create_sample_gif.py</a></b></td>
					<td style='padding: 8px;'>- 產生測試用的範例動圖 sample.gif。<br>- 共 10 幀、200×200，每幀使用不同底色並標上幀號與延遲時間，延遲從 100 ms 起逐幀增加，可用來確認拆解後的逐幀時長是否正確。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/test_agent_api.py'>test_agent_api.py</a></b></td>
					<td style='padding: 8px;'>- API 冒煙測試腳本。<br>- 對 8000 埠的服務上傳 sample.gif，確認拆解出 10 幀，再取前 5 幀合成 GIF 與 Sprite Sheet，檢查輸出存在且版面資訊正確。<br>- 不包含去背流程的測試。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/.gitattributes'>.gitattributes</a></b></td>
					<td style='padding: 8px;'>- 固定 .bat 批次檔使用 CRLF 換行。<br>- 避免 cmd.exe 誤讀 LF 換行的批次檔，把指令切錯而無法啟動。</td>
				</tr>
			</table>
		</blockquote>
	</details>
	<!-- static Submodule -->
	<details>
		<summary><b>static</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ static</b></code>
			<table style='width: 100%; border-collapse: collapse;'>
			<thead>
				<tr style='background-color: #f8f9fa;'>
					<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
					<th style='text-align: left; padding: 8px;'>Summary</th>
				</tr>
			</thead>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/static/index.html'>index.html</a></b></td>
					<td style='padding: 8px;'>- 單頁工作區的版面骨架。<br>- 包含頂列的模式切換（切割、拆解、去背、對齊、導出）、中央畫布、右側屬性面板與底部時間軸，以及上傳卡片、拖曳浮層、進度與錯誤卡片等狀態元件。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/static/script.js'>script.js</a></b></td>
					<td style='padding: 8px;'>- 前端的主控邏輯與共用狀態。<br>- 處理檔案上傳與拖放、時間軸的建立與播放、拖曳指針、保留與略過影格、逐幀去背與錯誤處理、手動微調，以及導出預覽與檔案下載。<br>- 切割與對齊模式共用這裡的渲染與 API 呼叫。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/static/slice.js'>slice.js</a></b></td>
					<td style='padding: 8px;'>- Sprite Sheet 切割模式。<br>- 開啟靜態圖時在背景偵測格子並提示可切割；提供自動偵測與規則網格，可在圖上移動、縮放、新增、刪除格子框，並把一格的調整套用到全部，最後依影格率切成動畫影格。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/static/align.js'>align.js</a></b></td>
					<td style='padding: 8px;'>- 對齊模式。<br>- 依參考幀縮放每一幀的角色範圍並限制最大差異，把底部、中心或頂部對齊點放到同一位置。<br>- 提供洋蔥皮、逐幀位移、縮放與翻轉、畫面拖曳，以及復原與重做。</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/rowing195/GIF-Converter/blob/main/static/style.css'>style.css</a></b></td>
					<td style='padding: 8px;'>- 工作區的深色主題樣式。<br>- 定義色彩與字型變數、頂列與分段控制、畫布與浮動卡片、屬性面板元件、時間軸縮圖與拖曳指針，並讓影格很多的時間軸在自己的範圍內橫向捲動，不影響上方畫布。</td>
				</tr>
			</table>
		</blockquote>
	</details>
</details>

---

## Getting Started

> 只是想使用工具的話，請直接前往 [Download](#download) 下載免安裝版。以下是從原始碼執行的方式。

### Prerequisites

This project requires the following dependencies:

- **Programming Language:** Python 3.10+（已在 Python 3.13 測試）
- **Package Manager:** pip

### Installation

Build GIF Converter from the source and install dependencies:

1. **Clone the repository:**

    ```sh
    ❯ git clone https://github.com/rowing195/GIF-Converter.git
    ```

2. **Navigate to the project directory:**

    ```sh
    ❯ cd GIF-Converter
    ```

3. **Install the dependencies:**

    ```sh
    ❯ pip install -r requirements.txt
    ```

### Usage

啟動後端服務（預設連接埠 8008）：

```sh
❯ python app.py
```

接著用瀏覽器開啟 [http://127.0.0.1:8008](http://127.0.0.1:8008)。在 Windows 上也可以直接雙擊 `start.bat`，會一併開啟頁面。

### Testing

本專案沒有 pytest 測試套件，只有一支 API 冒煙測試腳本 `test_agent_api.py`，涵蓋拆解與合成（不含去背）。腳本固定連線到 **8000 埠**，所以要先在該埠啟動服務：

```sh
❯ python -m uvicorn app:app --port 8000
```

再開另一個終端機執行：

```sh
❯ python test_agent_api.py
```

測試使用專案內的 `sample.gif`；如需重新產生，執行 `python create_sample_gif.py`。

---

## Building the EXE

在 Windows 上執行：

```sh
❯ build_exe.bat
```

會產出 `dist/GIFConverter/`（資料夾版）與 `dist/GIFConverter.zip`（散布用）。

打包前請**先執行過一次 AI 去背**，讓 `rembg` 將 `u2net.onnx` 下載到 `~/.u2net`——打包腳本會把該模型內建進成品，使其開箱即可離線使用。

> 打包設定針對 conda 環境做了兩項修正：補進 `Library/bin` 中的 DLL，並將 MSVC 執行期替換為系統版本（conda 的 14.27 會導致 onnxruntime 的 DLL 初始化失敗）。

---

## API Reference

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

## Contributing

- **🐛 [Report Issues](https://github.com/rowing195/GIF-Converter/issues)**: 回報錯誤或提出功能建議。
- **💡 [Submit Pull Requests](https://github.com/rowing195/GIF-Converter/pulls)**: 檢視或提交 Pull Request。

<details closed>
<summary>Contributing Guidelines</summary>

1. **Fork the Repository**: 先將專案 fork 到自己的 GitHub 帳號。
2. **Clone Locally**: 把 fork 後的專案 clone 到本機。
   ```sh
   git clone https://github.com/rowing195/GIF-Converter.git
   ```
3. **Create a New Branch**: 為修改建立一個有描述性名稱的新分支。
   ```sh
   git checkout -b new-feature-x
   ```
4. **Make Your Changes**: 在本機開發並測試修改。
5. **Commit Your Changes**: 用清楚的訊息描述這次修改。
   ```sh
   git commit -m 'Implemented new feature x.'
   ```
6. **Push to GitHub**: 推送到自己 fork 的專案。
   ```sh
   git push origin new-feature-x
   ```
7. **Submit a Pull Request**: 對原專案建立 Pull Request。
8. **Review**: 審核通過後就會合併。

</details>

<details closed>
<summary>Contributor Graph</summary>
<br>
<p align="left">
   <a href="https://github.com/rowing195/GIF-Converter/graphs/contributors">
      <img src="https://contrib.rocks/image?repo=rowing195/GIF-Converter">
   </a>
</p>
</details>

---

## License

GIF Converter 以 MIT License 釋出，可自由使用。

---

## Acknowledgments

- [rembg](https://github.com/danielgatis/rembg)：本工具的去背引擎與模型下載管理
- [U²-Net](https://github.com/xuebinqin/U-2-Net) 與 [DIS / IS-Net](https://github.com/xuebinqin/DIS)：去背模型的原始研究
- [FastAPI](https://github.com/fastapi/fastapi)、[Pillow](https://github.com/python-pillow/Pillow)、[ONNX Runtime](https://github.com/microsoft/onnxruntime)、[PyInstaller](https://github.com/pyinstaller/pyinstaller)
- README 結構參考 [readme-ai](https://github.com/eli64s/readme-ai)

<div align="left"><a href="#top">Back to top</a></div>

---
