import {
  SUPPORTED_LANGS,
  emptyDraft,
  createColumn,
  langMeta,
  draftToLessonJson,
  lessonJsonToDraft,
  validateLessonJson,
  countLines,
} from "./lessonBuilder.js";
import {
  downloadLessonJson,
  saveLocalLesson,
  slugifyId,
} from "./lessons.js";

const UI = {
  zh: {
    tagline: "使用者自訂內容",
    title: "依指示填寫，產出一堂練習 JSON",
    lead: "自行增減語言欄，各貼多行文本（第 N 行互相對應）。每種語言的提示列可加可不加。完成後可下載到 <code>data/lessons/</code>，或先存在瀏覽器內練習。",
    backPractice: "回練習頁",
    step1: "填寫課程資訊",
    step2: "新增語言欄、貼上多行文本；提示列可選",
    step3: "預覽 JSON → 下載檔案或儲存後開始練習",
    metaHeading: "1. 課程資訊",
    fieldId: "課程 ID（檔名用）",
    fieldSpeaker: "講者",
    fieldTitleZh: "標題（中文）",
    fieldTitleEn: "標題（English）",
    fieldTrackZh: "軌道名稱（中文）",
    fieldTrackEn: "軌道名稱（English）",
    fieldDescZh: "軌道說明（中文）",
    fieldDescEn: "軌道說明（English）",
    linesHeading: "2. 多語語音文本",
    linesHint:
      "每個語言欄各放多行；第 1 行對第 1 行。可為該語言「加入提示」或省略；提示不送進 TTS。",
    addLang: "新增語言",
    removeLang: "移除",
    addHint: "加入提示",
    removeHint: "移除提示",
    hintType: "類型",
    hintRomaji: "羅馬拼音",
    hintLabel: "提示",
    lineUnit: "{n} 行",
    noLangLeft: "可選語言已全部加入",
    needOneLang: "至少保留一種語言",
    jsonHeading: "3. JSON 預覽與存檔",
    preview: "轉換預覽",
    importJson: "匯入 JSON",
    download: "下載 JSON",
    saveLocal: "存到瀏覽器",
    practice: "開始練習",
    saveHint:
      "正式課程：把下載的 <code>*.json</code> 放到 <code>data/lessons/</code> 後重新整理即可（目錄會自動掃描；預設優先 <code>interview-self-intro</code>）。",
    footer: "自訂內容會轉成與正式課程相同的 JSON 契約",
    saved: "已存到瀏覽器，可回練習頁選擇此課程。",
    previewOk: "JSON 已就緒。",
    importOk: "已匯入 JSON，可再編輯後重新轉換。",
    needPreview: "請先按「轉換預覽」產生有效 JSON。",
  },
  en: {
    tagline: "Custom user content",
    title: "Fill the form → get one practice lesson JSON",
    lead: "Add or remove language columns, paste multiline text (line N matches line N). Per-language hint rows are optional. Download into <code>data/lessons/</code>, or keep it in the browser.",
    backPractice: "Back to practice",
    step1: "Enter lesson info",
    step2: "Add language columns and paste multiline text; hints optional",
    step3: "Preview JSON → download or save, then practice",
    metaHeading: "1. Lesson info",
    fieldId: "Lesson ID (filename)",
    fieldSpeaker: "Speaker",
    fieldTitleZh: "Title (Chinese)",
    fieldTitleEn: "Title (English)",
    fieldTrackZh: "Track name (Chinese)",
    fieldTrackEn: "Track name (English)",
    fieldDescZh: "Track description (Chinese)",
    fieldDescEn: "Track description (English)",
    linesHeading: "2. Multilingual text",
    linesHint:
      "Each language column is multiline; line 1 pairs with line 1. Add or omit hint rows per language (not spoken).",
    addLang: "Add language",
    removeLang: "Remove",
    addHint: "Add hint",
    removeHint: "Remove hint",
    hintType: "Type",
    hintRomaji: "Romaji",
    hintLabel: "Hint",
    lineUnit: "{n} lines",
    noLangLeft: "All languages already added",
    needOneLang: "Keep at least one language",
    jsonHeading: "3. JSON preview & save",
    preview: "Convert / preview",
    importJson: "Import JSON",
    download: "Download JSON",
    saveLocal: "Save in browser",
    practice: "Start practice",
    saveHint:
      "Packaged lessons: drop the downloaded <code>*.json</code> into <code>data/lessons/</code> and refresh (the folder is auto-scanned; default prefers <code>interview-self-intro</code>).",
    footer: "Custom content uses the same JSON contract as packaged lessons",
    saved: "Saved in the browser. Pick this lesson on the practice page.",
    previewOk: "JSON is ready.",
    importOk: "JSON imported — edit and convert again if needed.",
    needPreview: "Convert / preview a valid JSON first.",
  },
};

const state = {
  uiLang: localStorage.getItem("plt-ui") || "zh",
  draft: emptyDraft(),
  /** @type {object|null} */
  lastJson: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

function t(key) {
  return UI[state.uiLang][key];
}

function showBanner(msg, isError = false) {
  const el = $("#banner");
  el.hidden = !msg;
  el.textContent = msg || "";
  el.classList.toggle("banner--error", Boolean(isError && msg));
}

const HTML_I18N = new Set(["lead", "saveHint"]);

function applyChromeCopy() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (key && UI[state.uiLang][key] != null) {
      if (HTML_I18N.has(key)) node.innerHTML = UI[state.uiLang][key];
      else node.textContent = UI[state.uiLang][key];
    }
  });
  document.documentElement.lang = state.uiLang === "zh" ? "zh-Hant" : "en";
  document.title =
    state.uiLang === "zh"
      ? "polyLinguatts — 自訂課程"
      : "polyLinguatts — Custom lesson";
  document.querySelectorAll("[data-ui-lang]").forEach((btn) => {
    btn.setAttribute(
      "aria-pressed",
      btn.dataset.uiLang === state.uiLang ? "true" : "false"
    );
  });
  renderAddLangSelect();
  renderColumns();
}

function syncMetaFieldsFromDraft() {
  const d = state.draft;
  $("#field-id").value = d.id;
  $("#field-speaker").value = d.speaker;
  $("#field-title-zh").value = d.titleZh;
  $("#field-title-en").value = d.titleEn;
  $("#field-track-zh").value = d.trackNameZh;
  $("#field-track-en").value = d.trackNameEn;
  $("#field-desc-zh").value = d.trackDescZh;
  $("#field-desc-en").value = d.trackDescEn;
}

function readMetaIntoDraft() {
  const d = state.draft;
  d.id =
    $("#field-id").value.trim() ||
    slugifyId($("#field-title-en").value || $("#field-title-zh").value);
  d.speaker = $("#field-speaker").value;
  d.titleZh = $("#field-title-zh").value;
  d.titleEn = $("#field-title-en").value;
  d.trackNameZh = $("#field-track-zh").value;
  d.trackNameEn = $("#field-track-en").value;
  d.trackDescZh = $("#field-desc-zh").value;
  d.trackDescEn = $("#field-desc-en").value;
  readColumnsFromDom();
}

function formatLineCount(n) {
  return t("lineUnit").replace("{n}", String(n));
}

function renderAddLangSelect() {
  const select = $("#add-lang");
  if (!select) return;
  const used = new Set(state.draft.columns.map((c) => c.code));
  const available = SUPPORTED_LANGS.filter((l) => !used.has(l.code));
  select.innerHTML = "";
  if (!available.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = t("noLangLeft");
    select.appendChild(opt);
    select.disabled = true;
    $("#btn-add-lang").disabled = true;
    return;
  }
  select.disabled = false;
  $("#btn-add-lang").disabled = false;
  for (const lang of available) {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = `${lang.short} · ${lang.label[state.uiLang] || lang.code}`;
    select.appendChild(opt);
  }
}

function updateLinedField(editorOrRoot) {
  const editor = editorOrRoot?.classList?.contains("lined-editor")
    ? editorOrRoot
    : editorOrRoot?.querySelector?.(".lined-editor");
  if (!editor) return;

  const ta = editor.querySelector(".lined-editor__input");
  const gutter = editor.querySelector(".lined-editor__gutter");
  if (!ta || !gutter) return;

  const countEl =
    editor.closest(".bulk-hint")?.querySelector(".line-count") ||
    editor
      .closest(".bulk-field")
      ?.querySelector(":scope > .bulk-field__head .line-count");

  const displayCount = countLines(ta.value);
  const minRows =
    Number.parseInt(
      getComputedStyle(editor).getPropertyValue("--lined-min-rows").trim(),
      10
    ) || 8;
  const gutterLines = Math.max(displayCount, minRows, 1);
  gutter.textContent = Array.from({ length: gutterLines }, (_, i) => i + 1).join(
    "\n"
  );
  if (countEl) countEl.textContent = formatLineCount(displayCount);

  // One hard newline → one gutter row → height grows by exactly one line.
  const styles = getComputedStyle(ta);
  const fontSize = Number.parseFloat(styles.fontSize) || 14.72;
  const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.55;
  const padY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  const heightPx = Math.ceil(padY + gutterLines * lineHeight);
  ta.style.height = `${heightPx}px`;
  gutter.style.height = `${heightPx}px`;
  gutter.scrollTop = 0;
  ta.scrollTop = 0;
}

function bindLinedEditor(wrapper) {
  const ta = wrapper.querySelector(".lined-editor__input");
  if (!ta) return;
  ta.addEventListener("input", () => {
    state.lastJson = null;
    updateLinedField(wrapper);
  });
}

function renderColumns() {
  const host = $("#columns-host");
  if (!host) return;
  host.innerHTML = "";

  state.draft.columns.forEach((col, index) => {
    const meta = langMeta(col.code);
    const card = document.createElement("article");
    card.className = "bulk-field";
    card.dataset.index = String(index);

    const head = document.createElement("div");
    head.className = "bulk-field__head";

    const titleWrap = document.createElement("div");
    titleWrap.className = "bulk-field__title";
    const label = document.createElement("span");
    label.className = "bulk-field__label";
    label.textContent = meta.short;
    const code = document.createElement("span");
    code.className = "bulk-field__code";
    code.textContent = `(${col.code})`;
    titleWrap.append(label, code);

    const headRight = document.createElement("div");
    headRight.className = "bulk-field__meta";
    const count = document.createElement("span");
    count.className = "line-count";
    count.setAttribute("aria-live", "polite");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn--ghost btn--compact";
    remove.textContent = t("removeLang");
    remove.disabled = state.draft.columns.length <= 1;
    remove.addEventListener("click", () => {
      if (state.draft.columns.length <= 1) {
        showBanner(t("needOneLang"), true);
        return;
      }
      readColumnsFromDom();
      state.draft.columns.splice(index, 1);
      state.lastJson = null;
      renderAddLangSelect();
      renderColumns();
    });
    headRight.append(count, remove);
    head.append(titleWrap, headRight);

    const editorWrap = document.createElement("div");
    editorWrap.className = "lined-editor";
    const gutter = document.createElement("pre");
    gutter.className = "lined-editor__gutter";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = "1";
    const ta = document.createElement("textarea");
    ta.className = "lined-editor__input";
    ta.rows = 10;
    ta.value = col.text;
    ta.spellcheck = true;
    ta.setAttribute("aria-label", `${meta.short} ${col.code}`);
    editorWrap.append(gutter, ta);

    const actions = document.createElement("div");
    actions.className = "bulk-field__actions";
    const hintToggle = document.createElement("button");
    hintToggle.type = "button";
    hintToggle.className = "btn btn--soft btn--compact";
    hintToggle.textContent = col.hintEnabled ? t("removeHint") : t("addHint");
    hintToggle.addEventListener("click", () => {
      readColumnsFromDom();
      const current = state.draft.columns[index];
      current.hintEnabled = !current.hintEnabled;
      if (!current.hintEnabled) current.hintText = "";
      state.lastJson = null;
      renderColumns();
    });
    actions.appendChild(hintToggle);

    card.append(head, editorWrap, actions);
    bindLinedEditor(editorWrap);
    updateLinedField(editorWrap);

    if (col.hintEnabled) {
      const hintBlock = document.createElement("div");
      hintBlock.className = "bulk-hint";

      const hintHead = document.createElement("div");
      hintHead.className = "bulk-field__head bulk-field__head--hint";
      const hintTitle = document.createElement("div");
      hintTitle.className = "bulk-field__title";
      const hintLabel = document.createElement("span");
      hintLabel.className = "bulk-field__label bulk-field__label--hint";
      hintLabel.textContent = `${meta.short} · ${t("hintLabel")}`;
      hintTitle.appendChild(hintLabel);

      const hintMeta = document.createElement("div");
      hintMeta.className = "bulk-field__meta";
      const hintCount = document.createElement("span");
      hintCount.className = "line-count";
      hintCount.setAttribute("aria-live", "polite");
      const typeLabel = document.createElement("label");
      typeLabel.className = "field field--inline field--tight";
      const typeCap = document.createElement("span");
      typeCap.textContent = t("hintType");
      const typeSelect = document.createElement("select");
      typeSelect.className = "hint-type-select";
      [
        ["ipa", "IPA"],
        ["romaji", t("hintRomaji")],
      ].forEach(([value, text]) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = text;
        if (col.hintType === value) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener("change", () => {
        state.draft.columns[index].hintType = /** @type {"ipa"|"romaji"} */ (
          typeSelect.value
        );
        state.lastJson = null;
      });
      typeLabel.append(typeCap, typeSelect);
      hintMeta.append(hintCount, typeLabel);
      hintHead.append(hintTitle, hintMeta);

      const hintEditor = document.createElement("div");
      hintEditor.className = "lined-editor lined-editor--hint";
      const hintGutter = document.createElement("pre");
      hintGutter.className = "lined-editor__gutter";
      hintGutter.setAttribute("aria-hidden", "true");
      hintGutter.textContent = "1";
      const hintTa = document.createElement("textarea");
      hintTa.className = "lined-editor__input";
      hintTa.rows = 6;
      hintTa.value = col.hintText;
      hintTa.spellcheck = false;
      hintTa.setAttribute("aria-label", `${meta.short} hint`);
      hintEditor.append(hintGutter, hintTa);

      hintBlock.append(hintHead, hintEditor);
      card.appendChild(hintBlock);
      bindLinedEditor(hintEditor);
      updateLinedField(hintEditor);
    }

    host.appendChild(card);
  });
}

function readColumnsFromDom() {
  const cards = document.querySelectorAll("#columns-host .bulk-field");
  cards.forEach((card, index) => {
    const col = state.draft.columns[index];
    if (!col) return;
    const textareas = card.querySelectorAll(".lined-editor__input");
    col.text = textareas[0]?.value ?? col.text;
    if (col.hintEnabled && textareas[1]) {
      col.hintText = textareas[1].value;
    }
    const typeSelect = card.querySelector(".hint-type-select");
    if (typeSelect) {
      col.hintType = /** @type {""|"romaji"|"ipa"} */ (typeSelect.value);
    }
  });
}

function buildJson() {
  readMetaIntoDraft();
  try {
    const json = draftToLessonJson(state.draft);
    const errors = validateLessonJson(json);
    if (errors.length) throw new Error(errors[0]);
    state.lastJson = json;
    $("#json-preview").textContent = JSON.stringify(json, null, 2);
    $("#btn-practice").href = `./?lesson=${encodeURIComponent(state.draft.id)}`;
    showBanner(t("previewOk"));
    return json;
  } catch (err) {
    state.lastJson = null;
    $("#json-preview").textContent = "";
    showBanner(err.message || String(err), true);
    return null;
  }
}

function ensureJson() {
  if (state.lastJson) return state.lastJson;
  return buildJson();
}

function bindControls() {
  document.querySelectorAll("[data-ui-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      readColumnsFromDom();
      state.uiLang = btn.dataset.uiLang;
      localStorage.setItem("plt-ui", state.uiLang);
      applyChromeCopy();
    });
  });

  $("#btn-add-lang").addEventListener("click", () => {
    const code = $("#add-lang").value;
    if (!code) return;
    readColumnsFromDom();
    if (state.draft.columns.some((c) => c.code === code)) return;
    state.draft.columns.push(createColumn(code));
    state.lastJson = null;
    renderAddLangSelect();
    renderColumns();
  });

  $("#btn-preview").addEventListener("click", () => buildJson());

  $("#btn-download").addEventListener("click", () => {
    const json = ensureJson();
    if (!json) return;
    downloadLessonJson(json, `${state.draft.id}.json`);
  });

  $("#btn-save-local").addEventListener("click", () => {
    const json = ensureJson();
    if (!json) return;
    saveLocalLesson(state.draft.id, json);
    localStorage.setItem("plt-lesson", state.draft.id);
    $("#btn-practice").href = `./?lesson=${encodeURIComponent(state.draft.id)}`;
    showBanner(t("saved"));
  });

  $("#btn-practice").addEventListener("click", (e) => {
    const json = ensureJson();
    if (!json) {
      e.preventDefault();
      showBanner(t("needPreview"), true);
      return;
    }
    saveLocalLesson(state.draft.id, json);
    localStorage.setItem("plt-lesson", state.draft.id);
  });

  $("#btn-import").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const errors = validateLessonJson(data);
      if (errors.length) throw new Error(errors[0]);
      state.draft = lessonJsonToDraft(data);
      if (!state.draft.id || state.draft.id === "imported-lesson") {
        state.draft.id = slugifyId(file.name.replace(/\.json$/i, ""));
      }
      syncMetaFieldsFromDraft();
      renderAddLangSelect();
      renderColumns();
      state.lastJson = data;
      $("#json-preview").textContent = JSON.stringify(data, null, 2);
      showBanner(t("importOk"));
    } catch (err) {
      showBanner(err.message || String(err), true);
    }
  });

  [
    "field-id",
    "field-speaker",
    "field-title-zh",
    "field-title-en",
    "field-track-zh",
    "field-track-en",
    "field-desc-zh",
    "field-desc-en",
  ].forEach((id) => {
    $(`#${id}`).addEventListener("input", () => {
      state.lastJson = null;
    });
  });
}

function boot() {
  applyChromeCopy();
  syncMetaFieldsFromDraft();
  bindControls();
  $("#json-preview").textContent = t("needPreview");
}

boot();
