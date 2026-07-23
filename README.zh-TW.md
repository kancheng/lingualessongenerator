# polyLinguatts

多語面試講稿練習工具，使用瀏覽器內建 **Web Speech API** 朗讀。  
從 JSON 載入中／英／日／德／法對照內容，依語種片段排隊發聲——無需後端、無需 API Key。

English docs: [README.md](./README.md)

## 功能特色

- 抓取並渲染多語講稿 JSON
- 軌道切換：中文全文、中英、中日、中德、中法
- 每句 **朗讀** 按鈕（依片段語種排隊 TTS）
- 點擊單一片段可只練習該語言
- 雙語對照軌道可選：**朗讀全部（對照）**、**朗讀全部中文**、或只朗讀對照語（英／日／德／法）
- 羅馬拼音／IPA 提示（僅顯示，不朗讀）
- 語速調整、停止
- 介面語言切換（中文／English）

## 快速開始

需要 Node.js 18+（僅用於靜態伺服器與重建資料）。

```bash
npm run build:data   # 從 script.txt 重新產生 data/script.json
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
├── index.html              # 應用主頁
├── css/styles.css          # 版面與視覺
├── js/
│   ├── app.js              # 抓取 JSON、渲染軌道／句子、綁定 UI
│   └── tts.js              # Web Speech API 佇列與聲線選擇
├── data/script.json        # 正式多語講稿資料
├── scripts/build-json.mjs  # script.txt → script.json
├── script.txt              # 原始對照講稿
├── README.md               # 英文文件
└── README.zh-TW.md         # 繁體中文文件（本檔）
```

## 系統架構

```text
[ data/script.json ]
        │ fetch
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

依規劃採用 **方案 B**：依 JSON 的 `lang` 分段，建立多個 `SpeechSynthesisUtterance`，再依序加入語音佇列。完全免費、免架伺服器。

## JSON 格式規範

執行期契約為 `data/script.json`。修改原文後可執行：

```bash
npm run build:data
```

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

1. 依相同區塊／對照慣例編輯 `script.txt`。
2. 執行 `npm run build:data`。
3. 重新整理網頁。

也可直接編輯 `data/script.json`，請維持瀏覽器可識別的 BCP-47 `lang` 值。

## 瀏覽器支援

| 瀏覽器 | 說明 |
| --- | --- |
| Chrome / Edge | 支援較完整；可用聲線取決於作業系統 |
| Safari | 在 Apple 裝置上品質通常較佳 |
| Firefox | Speech Synthesis 支援有限或不穩定 |

## 授權

Apache License 2.0 — 見 [LICENSE](./LICENSE)。
