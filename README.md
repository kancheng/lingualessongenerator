# polyLinguatts

Multilingual interview script practice powered by the browser **Web Speech API**.  
Load line-by-line Chinese / English / Japanese / German / French content from JSON, then speak each segment with the correct language voice—no backend, no API key.

中文說明見 [README.zh-TW.md](./README.zh-TW.md)。

## Features

- Fetch and render multilingual script JSON
- Track switcher: full Chinese, ZH–EN, ZH–JA, ZH–DE, ZH–FR
- Per-line **Speak** button (queued segment TTS)
- Click a single segment to practice that language only
- On bilingual tracks: **Play all (both)**, **Play all Chinese**, or **Play all** of the paired language (EN / JA / DE / FR)
- Romaji / IPA hints (display only, not spoken)
- Playback rate control and stop
- UI language toggle (中文 / English)

## Quick start

Requires Node.js 18+ (only for the static server and data rebuild).

```bash
npm run build:data   # regenerate data/script.json from script.txt
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
├── index.html              # App shell
├── css/styles.css          # Layout & visual system
├── js/
│   ├── app.js              # Fetch JSON, render tracks/lines, bind UI
│   └── tts.js              # Web Speech API queue + voice picking
├── data/script.json        # Canonical multilingual script data
├── scripts/build-json.mjs  # script.txt → script.json
├── script.txt              # Source bilingual / multilingual lines
├── README.md               # English docs (this file)
└── README.zh-TW.md         # Traditional Chinese docs
```

## Architecture

```text
[ data/script.json ]
        │ fetch
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

TTS uses **Scheme B** from the planning notes: segment the line by `lang`, create one `SpeechSynthesisUtterance` per segment, and play them in order. This is free, offline-capable (after voices are installed), and needs no server.

## JSON format

`data/script.json` is the runtime contract. Regenerate it any time with:

```bash
npm run build:data
```

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

1. Edit `script.txt` using the same block / pairing conventions.
2. Run `npm run build:data`.
3. Refresh the page.

Or edit `data/script.json` directly—keep `lang` values as BCP-47 tags the browser understands.

## Browser support

| Browser | Notes |
| --- | --- |
| Chrome / Edge | Best general support; voice list depends on OS |
| Safari | Good quality on Apple devices |
| Firefox | Limited / inconsistent Speech Synthesis support |

## License

Apache License 2.0 — see [LICENSE](./LICENSE).
