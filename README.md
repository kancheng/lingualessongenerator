# lingualessongenerator

Multilingual interview script practice powered by the browser **Web Speech API**.  
Load line-by-line Chinese / English / Japanese / German / French content from JSON, then speak each segment with the correct language voice—no backend, no API key.

中文說明見 [README.zh-TW.md](./README.zh-TW.md)。

## Features

- Load practice lessons by **auto-scanning** `data/lessons/` (**one JSON file = one lesson**; no manual manifest edits)
- Lesson picker; deep-link with `?lesson=lesson-id`
- **Custom content editor** (`editor.html`): guided form → official lesson JSON
- Track switcher: full Chinese, ZH–EN, ZH–JA, ZH–DE, ZH–FR (depends on the lesson)
- Per-line **Speak** button (queued segment TTS)
- Click a single segment to practice that language only
- On bilingual tracks: **Play all (both)**, **Play all Chinese**, or **Play all** of the paired language (EN / JA / DE / FR)
- Romaji / IPA hints (display only, not spoken)
- Playback rate control and stop
- UI language toggle (中文 / English)

## Quick start

Requires Node.js 18+ (only for the static server and data rebuild).

```bash
npm run build:data   # rebuild the default lesson under data/lessons/
npm start            # serve at http://localhost:5173
```

Open the URL in **Chrome**, **Edge**, or **Safari** (browsers with Web Speech API support).

You can also open the folder with any static file server:

```bash
npx serve .
# or
python -m http.server 5173
```

> Opening `index.html` via `file://` may block `fetch` for JSON. Prefer a local HTTP server.

## Project structure

```text
polyLinguatts/
├── index.html              # Practice UI (lesson picker + TTS)
├── editor.html             # Custom content → JSON
├── css/styles.css          # Layout & visual system
├── js/
│   ├── app.js              # Load lessons, render tracks/lines
│   ├── editor.js           # Guided custom-content form
│   ├── lessons.js          # Lesson loading, local saves
│   ├── lessonBuilder.js    # Form ↔ JSON
│   └── tts.js              # Web Speech API queue + voice picking
├── data/
│   ├── lessons/
│   │   ├── manifest.json   # Auto-generated (or live-scanned by npm start)
│   │   └── *.json          # One file = one practice lesson
│   └── script.json         # Legacy alias (written by build)
├── scripts/
│   ├── build-json.mjs      # script.txt → lessons + scan
│   ├── scan-lessons.mjs    # Scan data/lessons/*.json
│   └── serve.mjs           # Static server + live lesson scan
├── script.txt              # Source for the default interview lesson
├── README.md               # English docs (this file)
└── README.zh-TW.md         # Traditional Chinese docs
```

## Architecture

```text
[ data/lessons/*.json ]  ← drop in to include (one file per lesson)
        │ live scan on npm start / or write manifest.json
        ▼
[ Frontend parse & render ] ── display text + Speak controls
        │ click
        ▼
[ Web Speech API queue ]
   segment.lang = zh-TW | en-US | ja-JP | de-DE | fr-FR
        │
        ▼
[ Browser TTS voices ]
```

Custom content uses `editor.html`: form → same JSON contract → download into `data/lessons/` or keep in the browser.

TTS uses **Scheme B** from the planning notes: segment the line by `lang`, create one `SpeechSynthesisUtterance` per segment, and play them in order. This is free, offline-capable (after voices are installed), and needs no server.

## Lesson directory (`data/lessons`)

The app **auto-scans** every `*.json` in this folder (skips `manifest.json`).

- With `npm start`: each load rescans the folder — drop a file and refresh.
- With another static server: run `npm run scan:lessons` (or `npm run build:data`) to write `manifest.json`.
- Default lesson: `interview-self-intro.json` if present, otherwise the first scanned file.

To add a packaged lesson: put the JSON in `data/lessons/`. **No** manual `manifest.json` edit.

## Custom user content

Open [editor.html](./editor.html) and follow three steps:

1. Enter lesson metadata.
2. Use **Add language** to include ZH / EN / JA / DE / FR columns. Paste multiline text (line 1 pairs with line 1). Per-language hint rows are optional. Each box shows its line count.
3. **Convert / preview** to JSON, then:
   - **Download JSON** → place `lesson-id.json` in `data/lessons/` and refresh
   - **Save in browser** → available immediately in the practice picker (marked “Browser”)
   - **Start practice** → auto-saves locally and returns to the practice page

**Import JSON** to edit an existing lesson, then download again to overwrite the file.

## JSON format

Each lesson file uses the contract below (`data/lessons/*.json`). Regenerate the default interview lesson with:

```bash
npm run build:data
```

This writes `data/lessons/interview-self-intro.json`, auto-scans and writes `manifest.json`, and syncs the legacy path `data/script.json`.

### Top level

| Field | Type | Description |
| --- | --- | --- |
| `version` | string | Schema version |
| `meta` | object | Title, speaker, language list, TTS note |
| `schema` | object | Human-readable field guide |
| `tracks` | array | Language tracks (tabs in the UI) |

### Track

```json
{
  "id": "zh-en",
  "name": { "zh": "中英對照", "en": "Chinese–English" },
  "description": { "zh": "...", "en": "..." },
  "lines": [ /* Line */ ]
}
```

### Line

Each spoken unit on screen:

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

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable line id |
| `segments` | yes | Ordered speakable chunks |
| `segments[].text` | yes | Text for display + TTS |
| `segments[].lang` | yes | BCP-47 tag for the voice (`zh-TW`, `en-US`, `ja-JP`, `de-DE`, `fr-FR`) |
| `segments[].role` | no | `primary` (Chinese) or `translation` |
| `hints` | no | Non-spoken helpers (`romaji` or `ipa`) |

### How `script.txt` maps to JSON

`script.txt` is split by `====` separators into five blocks:

1. **Full Chinese** paragraphs → track `zh`
2. **Chinese + English** pairs → track `zh-en`
3. **Chinese + Japanese + romaji** → track `zh-ja` (`hints.type = "romaji"`)
4. **Chinese + German + IPA** → track `zh-de` (`hints.type = "ipa"`)
5. **Chinese + French + IPA** → track `zh-fr` (`hints.type = "ipa"`)

IPA lines in the source look like `[ˈɡuːtn̩ …]` and are stored without the brackets. Romaji / IPA are **never** sent to TTS.

## Usage tips

1. Install OS language packs if a language sounds wrong or falls back to the wrong voice (Windows: Settings → Time & language → Speech).
2. Use **Speak** on a line to hear Chinese then the translation in sequence.
3. On a pair track (e.g. Chinese–German), choose **Play all (both)**, **Play all Chinese**, or **Play all German**.
4. Click a single segment chip to drill one language.
5. Adjust **Rate** before long practice sessions.

## Extending the content

### A. Custom editor (typical users)

See **Custom user content** above: form → JSON → download into `data/lessons/` or save in the browser.

### B. Rebuild the default interview script

1. Edit `script.txt` using the same block / pairing conventions.
2. Run `npm run build:data`.
3. Refresh the page.

### C. Edit JSON directly

Edit `data/lessons/<id>.json` (or the legacy `data/script.json`), keep BCP-47 `lang` tags the browser understands. Files in `data/lessons/` are picked up automatically.

## Browser support

| Browser | Notes |
| --- | --- |
| Chrome / Edge | Best general support; voice list depends on OS |
| Safari | Good quality on Apple devices |
| Firefox | Limited / inconsistent Speech Synthesis support |

## License

Apache License 2.0 — see [LICENSE](./LICENSE).
