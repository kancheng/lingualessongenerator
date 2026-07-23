/**
 * Build / validate practice-lesson JSON from dynamic multilingual columns.
 *
 * Each column = one language (multiline). Same line index pairs across columns.
 * Each column may optionally enable its own hint lines (also line-aligned).
 */

export const SUPPORTED_LANGS = [
  { code: "zh-TW", short: "ZH", label: { zh: "中文", en: "Chinese" } },
  { code: "en-US", short: "EN", label: { zh: "英文", en: "English" } },
  { code: "ja-JP", short: "JA", label: { zh: "日文", en: "Japanese" } },
  { code: "de-DE", short: "DE", label: { zh: "德文", en: "German" } },
  { code: "fr-FR", short: "FR", label: { zh: "法文", en: "French" } },
];

/**
 * @typedef {{
 *   code: string,
 *   text: string,
 *   hintEnabled: boolean,
 *   hintText: string,
 *   hintType: ""|"romaji"|"ipa"
 * }} LangColumn
 *
 * @typedef {{
 *   id: string,
 *   titleZh: string,
 *   titleEn: string,
 *   speaker: string,
 *   trackNameZh: string,
 *   trackNameEn: string,
 *   trackDescZh: string,
 *   trackDescEn: string,
 *   columns: LangColumn[]
 * }} LessonDraft
 */

/** Split into lines; keep internal blanks, drop a single trailing empty from final newline. */
export function splitLines(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized) return [];
  const lines = normalized.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Count display lines (same rules as splitLines). */
export function countLines(text) {
  return splitLines(text).length;
}

/** @param {string} code */
export function langMeta(code) {
  return (
    SUPPORTED_LANGS.find((l) => l.code === code) || {
      code,
      short: code.split("-")[0].toUpperCase().slice(0, 3) || "LANG",
      label: { zh: code, en: code },
    }
  );
}

/** @param {string} code */
export function createColumn(code) {
  return {
    code,
    text: "",
    hintEnabled: false,
    hintText: "",
    hintType: code === "ja-JP" ? "romaji" : code.startsWith("de") || code.startsWith("fr") ? "ipa" : "ipa",
  };
}

/**
 * @returns {LessonDraft}
 */
export function emptyDraft() {
  return {
    id: "my-lesson",
    titleZh: "",
    titleEn: "",
    speaker: "",
    trackNameZh: "自訂對照",
    trackNameEn: "Custom",
    trackDescZh: "使用者自訂的多語朗讀練習。",
    trackDescEn: "Custom multilingual speaking practice.",
    columns: [createColumn("zh-TW"), createColumn("en-US")],
  };
}

/**
 * @param {LessonDraft} draft
 */
export function draftToLessonJson(draft) {
  const columns = (draft.columns || []).filter((c) => c?.code);
  if (!columns.length) {
    throw new Error("請至少新增一種語言 / Add at least one language");
  }

  const splitCols = columns.map((c) => ({
    ...c,
    body: splitLines(c.text),
    hints: c.hintEnabled ? splitLines(c.hintText) : [],
  }));

  const max = Math.max(
    0,
    ...splitCols.map((c) => Math.max(c.body.length, c.hints.length))
  );

  if (!max) {
    throw new Error("請至少填寫一行文本 / Add at least one line of text");
  }

  const id = (draft.id || "my-lesson").trim() || "my-lesson";
  const idSafe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const languages = columns.map((c) => c.code);
  const lines = [];

  for (let i = 0; i < max; i++) {
    const segments = [];
    for (const col of splitCols) {
      const text = (col.body[i] ?? "").trim();
      if (!text) continue;
      segments.push({
        text,
        lang: col.code,
        role: segments.length ? "translation" : "primary",
      });
    }
    if (!segments.length) continue;

    const line = {
      id: `${idSafe}_${String(lines.length + 1).padStart(3, "0")}`,
      segments,
    };

    const hints = [];
    for (const col of splitCols) {
      if (!col.hintEnabled) continue;
      const hintText = (col.hints[i] ?? "").trim();
      if (!hintText || !col.hintType) continue;
      hints.push({ type: col.hintType, text: hintText, lang: col.code });
    }
    if (hints.length) line.hints = hints;

    lines.push(line);
  }

  if (!lines.length) {
    throw new Error("請至少填寫一句完整內容 / Add at least one non-empty line");
  }

  const shorts = languages.map((code) => langMeta(code).short.toLowerCase());
  const trackId = shorts.join("-") || "custom";

  return {
    version: "1.0",
    meta: {
      title: {
        zh: draft.titleZh.trim() || id,
        en: draft.titleEn.trim() || draft.titleZh.trim() || id,
      },
      speaker: draft.speaker.trim() || "Custom",
      languages,
      tts: "Web Speech API",
      source: "custom-editor",
    },
    schema: {
      line: {
        id: "string",
        segments: [
          { text: "string", lang: "BCP-47", role: "primary|translation" },
        ],
        hints: [{ type: "romaji|ipa", text: "string", lang: "BCP-47?" }],
      },
    },
    tracks: [
      {
        id: trackId,
        name: {
          zh: draft.trackNameZh.trim() || "自訂對照",
          en: draft.trackNameEn.trim() || "Custom",
        },
        description: {
          zh: draft.trackDescZh.trim() || "",
          en: draft.trackDescEn.trim() || "",
        },
        lines,
      },
    ],
  };
}

/**
 * @param {object} data
 * @returns {LessonDraft}
 */
export function lessonJsonToDraft(data) {
  const draft = emptyDraft();
  const track = data?.tracks?.[0];
  const meta = data?.meta ?? {};

  draft.id = slugFromMeta(meta) || "imported-lesson";
  draft.titleZh = meta.title?.zh ?? "";
  draft.titleEn = meta.title?.en ?? "";
  draft.speaker = meta.speaker ?? "";
  draft.trackNameZh = track?.name?.zh ?? draft.trackNameZh;
  draft.trackNameEn = track?.name?.en ?? draft.trackNameEn;
  draft.trackDescZh = track?.description?.zh ?? "";
  draft.trackDescEn = track?.description?.en ?? "";

  const langOrder = [];
  const seen = new Set();
  for (const code of meta.languages || []) {
    if (!seen.has(code)) {
      seen.add(code);
      langOrder.push(code);
    }
  }
  for (const line of track?.lines || []) {
    for (const seg of line.segments || []) {
      if (seg.lang && !seen.has(seg.lang)) {
        seen.add(seg.lang);
        langOrder.push(seg.lang);
      }
    }
  }
  if (!langOrder.length) langOrder.push("zh-TW", "en-US");

  const buckets = Object.fromEntries(
    langOrder.map((code) => [code, { texts: [], hints: [], hintType: "", hintCount: 0 }])
  );

  for (const line of track?.lines || []) {
    const byLang = {};
    for (const seg of line.segments || []) {
      if (seg.lang) byLang[seg.lang] = seg.text ?? "";
    }
    for (const code of langOrder) {
      buckets[code].texts.push(byLang[code] ?? "");
    }

    const hints = line.hints || [];
    const used = new Set();

    for (const code of langOrder) {
      const tagged = hints.find((h) => h.lang === code);
      if (tagged) {
        buckets[code].hints.push(tagged.text ?? "");
        if (tagged.type === "ipa" || tagged.type === "romaji") {
          buckets[code].hintType = tagged.type;
        }
        buckets[code].hintCount += 1;
        used.add(tagged);
      } else {
        buckets[code].hints.push("");
      }
    }

    for (const h of hints) {
      if (h.lang || used.has(h)) continue;
      const target = langOrder.find((code) => {
        const idx = buckets[code].hints.length - 1;
        return !buckets[code].hints[idx];
      });
      if (!target) break;
      const idx = buckets[target].hints.length - 1;
      buckets[target].hints[idx] = h.text ?? "";
      if (h.type === "ipa" || h.type === "romaji") {
        buckets[target].hintType = h.type;
      }
      buckets[target].hintCount += 1;
    }
  }

  draft.columns = langOrder.map((code) => {
    const b = buckets[code];
    const col = createColumn(code);
    col.text = b.texts.join("\n");
    col.hintEnabled = b.hintCount > 0;
    col.hintText = b.hints.join("\n");
    if (b.hintType) col.hintType = b.hintType;
    return col;
  });

  return draft;
}

function slugFromMeta(meta) {
  const t = meta?.title?.en || meta?.title?.zh || "";
  return String(t)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * @param {object} data
 * @returns {string[]}
 */
export function validateLessonJson(data) {
  const errors = [];
  if (!data || typeof data !== "object") {
    errors.push("JSON 必須是物件 / JSON must be an object");
    return errors;
  }
  if (!Array.isArray(data.tracks) || !data.tracks.length) {
    errors.push("缺少 tracks / missing tracks");
    return errors;
  }
  for (const track of data.tracks) {
    if (!Array.isArray(track.lines) || !track.lines.length) {
      errors.push(`軌道 ${track.id || "?"} 沒有句子 / track has no lines`);
      continue;
    }
    for (const line of track.lines) {
      if (!Array.isArray(line.segments) || !line.segments.length) {
        errors.push(`句子 ${line.id || "?"} 缺少 segments`);
        continue;
      }
      for (const seg of line.segments) {
        if (!seg.text?.trim()) errors.push(`句子 ${line.id} 有空白文字`);
        if (!seg.lang) errors.push(`句子 ${line.id} 缺少 lang`);
      }
    }
  }
  return errors;
}
