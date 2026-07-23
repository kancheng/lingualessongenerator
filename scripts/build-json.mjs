/**
 * Parse script.txt into the project's multilingual JSON schema.
 * Run: node scripts/build-json.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "script.txt"), "utf8");

const blocks = src
  .split(/={10,}/)
  .map((b) => b.trim())
  .filter(Boolean);

function pad(n, w = 3) {
  return String(n).padStart(w, "0");
}

function isIpaLine(line) {
  return /^\[.+\]$/.test(line.trim());
}

function parseZhFull(text) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, "").trim())
    .filter(Boolean);
  return paras.map((text, i) => ({
    id: `zh_${pad(i + 1)}`,
    segments: [{ text, lang: "zh-TW", role: "primary" }],
  }));
}

function parsePairs(text, { otherLang, hintType }) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result = [];
  let i = 0;
  let idx = 1;

  while (i < lines.length) {
    const zh = lines[i++];
    if (!zh) continue;

    const other = lines[i++] ?? "";
    let hint = null;

    if (i < lines.length) {
      const next = lines[i];
      if (hintType === "romaji" && !isIpaLine(next) && !looksLikeChinese(next)) {
        // romaji line (latin + spaces/punctuation)
        if (/^[A-Za-zĀāĪīŪūĒēŌō\s.,!?'\-–—]+$/.test(next) || hasRomajiMarkers(next)) {
          hint = { type: "romaji", text: next };
          i++;
        }
      } else if (hintType === "ipa" && isIpaLine(next)) {
        hint = { type: "ipa", text: next.slice(1, -1) };
        i++;
      }
    }

    const prefix =
      otherLang === "en-US"
        ? "zh_en"
        : otherLang === "ja-JP"
          ? "zh_ja"
          : otherLang === "de-DE"
            ? "zh_de"
            : "zh_fr";

    const line = {
      id: `${prefix}_${pad(idx++)}`,
      segments: [
        { text: zh, lang: "zh-TW", role: "primary" },
        { text: other, lang: otherLang, role: "translation" },
      ],
    };
    if (hint) line.hints = [hint];
    result.push(line);
  }
  return result;
}

function looksLikeChinese(s) {
  return /[\u4e00-\u9fff]/.test(s);
}

function hasRomajiMarkers(s) {
  // Japanese romaji often has macrons or words like "desu", "wa", "no"
  return /[āīūēōĀĪŪĒŌ]|desu|moshimasu|shimasu/.test(s);
}

const tracks = [
  {
    id: "zh",
    name: { zh: "中文全文", en: "Full Chinese" },
    description: {
      zh: "面試自我介紹完整中文講稿。",
      en: "Full Chinese interview self-introduction.",
    },
    lines: parseZhFull(blocks[0]),
  },
  {
    id: "zh-en",
    name: { zh: "中英對照", en: "Chinese–English" },
    description: {
      zh: "逐句中英對照，適合練習雙語朗讀。",
      en: "Line-by-line Chinese–English pairs for bilingual practice.",
    },
    lines: parsePairs(blocks[1], { otherLang: "en-US", hintType: null }),
  },
  {
    id: "zh-ja",
    name: { zh: "中日對照", en: "Chinese–Japanese" },
    description: {
      zh: "逐句中日對照，並附羅馬拼音提示。",
      en: "Line-by-line Chinese–Japanese pairs with romaji hints.",
    },
    lines: parsePairs(blocks[2], { otherLang: "ja-JP", hintType: "romaji" }),
  },
  {
    id: "zh-de",
    name: { zh: "中德對照", en: "Chinese–German" },
    description: {
      zh: "逐句中德對照，並附國際音標（IPA）。",
      en: "Line-by-line Chinese–German pairs with IPA hints.",
    },
    lines: parsePairs(blocks[3], { otherLang: "de-DE", hintType: "ipa" }),
  },
  {
    id: "zh-fr",
    name: { zh: "中法對照", en: "Chinese–French" },
    description: {
      zh: "逐句中法對照，並附國際音標（IPA）。",
      en: "Line-by-line Chinese–French pairs with IPA hints.",
    },
    lines: parsePairs(blocks[4], { otherLang: "fr-FR", hintType: "ipa" }),
  },
];

const data = {
  version: "1.0",
  meta: {
    title: {
      zh: "多語面試自我介紹",
      en: "Multilingual Interview Self-Introduction",
    },
    speaker: "Haocheng Kan / 干皓丞",
    languages: ["zh-TW", "en-US", "ja-JP", "de-DE", "fr-FR"],
    tts: "Web Speech API",
    source: "script.txt",
  },
  schema: {
    line: {
      id: "string",
      segments: [{ text: "string", lang: "BCP-47", role: "primary|translation" }],
      hints: [{ type: "romaji|ipa", text: "string" }],
    },
  },
  tracks,
};

const outDir = path.join(root, "data");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "script.json");
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");

const counts = tracks.map((t) => `${t.id}: ${t.lines.length} lines`).join(", ");
console.log(`Wrote ${outPath}`);
console.log(counts);
