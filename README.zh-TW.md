# lingualessongenerator

多語面試講稿練習工具，使用瀏覽器內建 **Web Speech API** 朗讀。  
從 JSON 載入中／英／日／德／法對照內容，依語種片段排隊發聲——無需後端、無需 API Key。

English docs: [README.md](./README.md)

## 功能特色

- 從 `data/lessons/` **自動掃描**練習課程（**一組 JSON = 一堂課**；無需手改 manifest）
- 課程選擇器；可用 `?lesson=課程ID` 直接開啟
- **自訂內容編輯器**（`editor.html`）：表單填多語文本 → 轉成正式 JSON
- 軌道切換：中文全文、中英、中日、中德、中法（依各課程內容而定）
- 每句 **朗讀** 按鈕（依片段語種排隊 TTS）
- 點擊單一片段可只練習該語言
- 雙語對照軌道可選：**朗讀全部（對照）**、**朗讀全部中文**、或只朗讀對照語（英／日／德／法）
- 羅馬拼音／IPA 提示（僅顯示，不朗讀）
- 語速調整、停止
- 介面語言切換（中文／English）

## 快速開始

需要 Node.js 18+（僅用於靜態伺服器與重建資料）。

```bash
npm run build:data   # 從 script.txt 重建預設課程（data/lessons/…）
npm start            # 於 http://localhost:5173 啟動
```

請用 **Chrome**、**Edge** 或 **Safari** 開啟（需支援 Web Speech API）。

也可用任何靜態伺服器：

```bash
npx serve .
# 或
python -m http.server 5173
```

> 若以 `file://` 直接開啟 `index.html`，瀏覽器可能封鎖 JSON 的 `fetch`。請改用本機 HTTP 伺服器。

## 專案結構

```text
polyLinguatts/
├── index.html              # 練習主頁（課程選擇＋朗讀）
├── editor.html             # 使用者自訂內容 → JSON
├── css/styles.css          # 版面與視覺
├── js/
│   ├── app.js              # 載入課程、渲染軌道／句子
│   ├── editor.js           # 自訂內容表單與轉換
│   ├── lessons.js          # 課程載入、本機暫存
│   ├── lessonBuilder.js    # 表單 ↔ JSON
│   └── tts.js              # Web Speech API 佇列與聲線選擇
├── data/
│   ├── lessons/
│   │   ├── manifest.json   # 可由掃描自動產生（npm start 則即時掃描）
│   │   └── *.json          # 每一檔 = 一堂練習課（放入即生效）
│   └── script.json         # 舊路徑相容別名（由 build 同步寫出）
├── scripts/
│   ├── build-json.mjs      # script.txt → lessons + 掃描
│   ├── scan-lessons.mjs    # 掃描 data/lessons/*.json
│   └── serve.mjs           # 靜態伺服＋即時掃描課程目錄
├── script.txt              # 預設課程原始對照講稿
├── README.md               # 英文文件
└── README.zh-TW.md         # 繁體中文文件（本檔）
```

## 系統架構

```text
[ data/lessons/*.json ]  ← 放入即自動納入（一檔一堂課）
        │ npm start 即時掃描 / 或寫入 manifest.json
        ▼
[ 前端解析與渲染 ] ── 顯示多語文本 + 朗讀按鈕
        │ 點擊
        ▼
[ Web Speech API 佇列 ]
   segment.lang = zh-TW | en-US | ja-JP | de-DE | fr-FR
        │
        ▼
[ 瀏覽器內建 TTS 聲線 ]
```

自訂內容另走 `editor.html`：表單 → 相同 JSON 契約 → 下載進 `data/lessons/` 或先存瀏覽器。

依規劃採用 **方案 B**：依 JSON 的 `lang` 分段，建立多個 `SpeechSynthesisUtterance`，再依序加入語音佇列。完全免費、免架伺服器。

## 課程目錄（data/lessons）

執行期從此目錄**自動掃描**所有 `*.json`（略過 `manifest.json`）。

- 使用 `npm start`：每次載入會即時掃描資料夾，放入新檔後重新整理即可。
- 使用其他靜態伺服器：先執行 `npm run scan:lessons`（或 `npm run build:data`）寫出 `manifest.json`。
- 預設課程：若存在 `interview-self-intro.json` 則優先，否則取掃描到的第一個。

新增正式課程：把 JSON 放進 `data/lessons/` 即可，**不必**手改 `manifest.json`。

## 使用者自訂內容

開啟 [editor.html](./editor.html)，依三步驟操作：

1. 填寫課程資訊。
2. 用「新增語言」增減語言欄（ZH／EN／JA／DE／FR），各貼多行文本（第 1 行對第 1 行）；每種語言可「加入提示」或省略。輸入框旁會顯示行數。
3. **轉換預覽** 產生 JSON，然後：
   - **下載 JSON**：存成 `課程ID.json`，放到 `data/lessons/` 後重新整理
   - **存到瀏覽器**：立刻可在練習頁選取（標記為「瀏覽器」）
   - **開始練習**：自動暫存後回到練習頁

也可 **匯入 JSON** 再開編輯，方便修改既有課程後重新下載覆蓋。

## JSON 格式規範

每一堂課的執行期契約與下方相同（檔案位於 `data/lessons/*.json`）。修改預設原文後可執行：

```bash
npm run build:data
```

這會寫入 `data/lessons/interview-self-intro.json`、自動掃描並寫出 `manifest.json`，並同步舊路徑 `data/script.json`。

### 頂層欄位

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `version` | string | Schema 版本 |
| `meta` | object | 標題、講者、語言列表、TTS 說明 |
| `schema` | object | 欄位說明（給人類閱讀） |
| `tracks` | array | 語言軌道（對應 UI 分頁） |

### 軌道（Track）

```json
{
  "id": "zh-en",
  "name": { "zh": "中英對照", "en": "Chinese–English" },
  "description": { "zh": "...", "en": "..." },
  "lines": [ /* Line */ ]
}
```

### 句子（Line）

畫面上每一句可朗讀單位：

```json
{
  "id": "zh_en_001",
  "segments": [
    { "text": "大家好，我是干皓丞。", "lang": "zh-TW", "role": "primary" },
    { "text": "Hello, everyone. My name is Haocheng Kan.", "lang": "en-US", "role": "translation" }
  ],
  "hints": [
    { "type": "romaji", "text": "Minasan, konnichiwa. ..." }
  ]
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `id` | 是 | 穩定的句子識別碼 |
| `segments` | 是 | 依序朗讀的片段陣列 |
| `segments[].text` | 是 | 顯示與 TTS 用文字 |
| `segments[].lang` | 是 | BCP-47 語系標籤（`zh-TW`、`en-US`、`ja-JP`、`de-DE`、`fr-FR`） |
| `segments[].role` | 否 | `primary`（中文）或 `translation`（譯文） |
| `hints` | 否 | 非朗讀輔助（`romaji` 或 `ipa`） |

### `script.txt` 對應方式

`script.txt` 以 `====` 分隔為五個區塊：

1. **中文全文** 段落 → 軌道 `zh`
2. **中英對照** → 軌道 `zh-en`
3. **中日對照 + 羅馬拼音** → 軌道 `zh-ja`（`hints.type = "romaji"`）
4. **中德對照 + IPA** → 軌道 `zh-de`（`hints.type = "ipa"`）
5. **中法對照 + IPA** → 軌道 `zh-fr`（`hints.type = "ipa"`）

原文中的 IPA 行為 `[ˈɡuːtn̩ …]` 形式，寫入 JSON 時會去掉中括號。羅馬拼音／IPA **不會**送進 TTS。

## 使用建議

1. 若某語言發音不正確或落到錯誤聲線，請安裝作業系統語言套件（Windows：設定 → 時間與語言 → 語音）。
2. 按句子的 **朗讀** 可先聽中文再聽譯文。
3. 在對照軌道（例如中德）可選 **朗讀全部（對照）**、**朗讀全部中文**、或 **朗讀全部德文**。
4. 點擊單一語種片段可做單語練習。
5. 長篇練習前可先調整 **語速**。

## 擴充內容

### 方式 A：自訂編輯器（一般使用者）

見上方「使用者自訂內容」：表單 → JSON → 下載進 `data/lessons/` 或存瀏覽器。

### 方式 B：重建預設面試講稿

1. 依相同區塊／對照慣例編輯 `script.txt`。
2. 執行 `npm run build:data`。
3. 重新整理網頁。

### 方式 C：直接改 JSON

編輯 `data/lessons/<id>.json`（或相容路徑 `data/script.json`），維持瀏覽器可識別的 BCP-47 `lang` 值。放入 `data/lessons/` 後會自動被掃描。

## 瀏覽器支援

| 瀏覽器 | 說明 |
| --- | --- |
| Chrome / Edge | 支援較完整；可用聲線取決於作業系統 |
| Safari | 在 Apple 裝置上品質通常較佳 |
| Firefox | Speech Synthesis 支援有限或不穩定 |

## 授權

Apache License 2.0 — 見 [LICENSE](./LICENSE)。
