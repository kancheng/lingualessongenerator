import { MultilingualTTS } from "./tts.js";

const DATA_URL = "./data/script.json";
const LANG_LABEL = {
  "zh-TW": "ZH",
  "en-US": "EN",
  "ja-JP": "JA",
  "de-DE": "DE",
  "fr-FR": "FR",
};

const LANG_NAME = {
  "zh-TW": { zh: "中文", en: "Chinese" },
  "en-US": { zh: "英文", en: "English" },
  "ja-JP": { zh: "日文", en: "Japanese" },
  "de-DE": { zh: "德文", en: "German" },
  "fr-FR": { zh: "法文", en: "French" },
};

const UI = {
  zh: {
    tagline: "多語講稿 · 分段朗讀",
    headline: "一句一句練，母語發音直接說。",
    lead: "從 JSON 載入中／英／日／德／法對照講稿，點擊朗讀即可用瀏覽器原生語音依語種發聲。",
    ctaStart: "開始練習",
    ctaDocs: "查看文件",
    tracks: "語言軌道",
    playAll: "朗讀全部",
    playAllPair: "朗讀全部（對照）",
    playAllLang: "朗讀全部{lang}",
    stop: "停止",
    rate: "語速",
    unsupported: "此瀏覽器不支援 Web Speech API，請改用 Chrome、Edge 或 Safari。",
    loadError: "無法載入講稿資料。",
    speaking: "朗讀中…",
    speak: "朗讀",
    speakLine: "朗讀此句",
    hintRomaji: "羅馬拼音",
    hintIpa: "音標",
    footer: "零後端 · Web Speech API · 資料來自 script.json",
  },
  en: {
    tagline: "Multilingual script · Segmented TTS",
    headline: "Practice line by line. Hear each language natively.",
    lead: "Load Chinese / English / Japanese / German / French pairs from JSON, then speak each segment with the browser’s built-in voices.",
    ctaStart: "Start practicing",
    ctaDocs: "Documentation",
    tracks: "Tracks",
    playAll: "Play all",
    playAllPair: "Play all (both)",
    playAllLang: "Play all {lang}",
    stop: "Stop",
    rate: "Rate",
    unsupported: "Web Speech API is not supported. Please use Chrome, Edge, or Safari.",
    loadError: "Failed to load script data.",
    speaking: "Speaking…",
    speak: "Speak",
    speakLine: "Speak this line",
    hintRomaji: "Romaji",
    hintIpa: "IPA",
    footer: "Zero backend · Web Speech API · Data from script.json",
  },
};

const state = {
  data: null,
  trackId: null,
  uiLang: localStorage.getItem("plt-ui") || "zh",
  tts: new MultilingualTTS(),
};

const $ = (sel, root = document) => root.querySelector(sel);

function t(key) {
  return UI[state.uiLang][key];
}

function localize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return obj[state.uiLang] ?? obj.zh ?? obj.en ?? "";
}

function applyChromeCopy() {
  $("[data-i18n='tagline']").textContent = t("tagline");
  $("[data-i18n='headline']").textContent = t("headline");
  $("[data-i18n='lead']").textContent = t("lead");
  $("[data-i18n='ctaStart']").textContent = t("ctaStart");
  $("[data-i18n='ctaDocs']").textContent = t("ctaDocs");
  $("[data-i18n='tracks']").textContent = t("tracks");
  $("[data-i18n='stop']").textContent = t("stop");
  $("[data-i18n='rate']").textContent = t("rate");
  $("[data-i18n='footer']").textContent = t("footer");

  document.documentElement.lang = state.uiLang === "zh" ? "zh-Hant" : "en";
  document.title =
    state.uiLang === "zh"
      ? "polyLinguatts — 多語朗讀練習"
      : "polyLinguatts — Multilingual TTS Practice";

  const docs = $("#cta-docs");
  if (docs) {
    docs.href = state.uiLang === "zh" ? "./README.zh-TW.md" : "./README.md";
  }

  document.querySelectorAll("[data-ui-lang]").forEach((btn) => {
    btn.setAttribute(
      "aria-pressed",
      btn.dataset.uiLang === state.uiLang ? "true" : "false"
    );
  });

  renderPlayScope();
}

function currentTrack() {
  return state.data?.tracks?.find((tr) => tr.id === state.trackId) ?? null;
}

/** Ordered unique BCP-47 langs in a track (primary Chinese first when present). */
function trackLanguages(track) {
  if (!track) return [];
  const seen = new Set();
  const langs = [];
  for (const line of track.lines) {
    for (const seg of line.segments || []) {
      if (!seg.lang || seen.has(seg.lang)) continue;
      seen.add(seg.lang);
      langs.push(seg.lang);
    }
  }
  langs.sort((a, b) => {
    if (a.startsWith("zh")) return -1;
    if (b.startsWith("zh")) return 1;
    return a.localeCompare(b);
  });
  return langs;
}

function langDisplayName(lang) {
  return localize(LANG_NAME[lang]) || LANG_LABEL[lang] || lang;
}

function renderPlayScope() {
  const host = $("#play-scope");
  if (!host) return;
  host.innerHTML = "";

  const track = currentTrack();
  const langs = trackLanguages(track);
  if (!langs.length) return;

  const isPair = langs.length >= 2;

  const makeBtn = (label, scope, className = "btn btn--soft") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.dataset.playScope = scope;
    btn.textContent = label;
    btn.addEventListener("click", () => playAll(scope));
    return btn;
  };

  if (isPair) {
    host.appendChild(makeBtn(t("playAllPair"), "all", "btn btn--soft"));
    langs.forEach((lang) => {
      const label = t("playAllLang").replace("{lang}", langDisplayName(lang));
      host.appendChild(makeBtn(label, lang, "btn btn--scope"));
    });
  } else {
    host.appendChild(makeBtn(t("playAll"), "all", "btn btn--soft"));
  }
}

function renderTracks() {
  const nav = $("#track-nav");
  nav.innerHTML = "";

  state.data.tracks.forEach((track) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track-chip";
    btn.dataset.trackId = track.id;
    btn.setAttribute("aria-pressed", track.id === state.trackId ? "true" : "false");
    btn.innerHTML = `<span class="track-chip__id">${track.id}</span><span class="track-chip__name">${localize(track.name)}</span>`;
    btn.addEventListener("click", () => {
      state.trackId = track.id;
      state.tts.stop();
      renderTracks();
      renderPanel();
      renderPlayScope();
    });
    nav.appendChild(btn);
  });
}

function renderPanel() {
  const track = currentTrack();
  const panel = $("#script-panel");
  if (!track) {
    panel.innerHTML = "";
    return;
  }

  $("#track-desc").textContent = localize(track.description);
  renderPlayScope();

  panel.innerHTML = "";
  const list = document.createElement("ol");
  list.className = "line-list";

  track.lines.forEach((line, index) => {
    const li = document.createElement("li");
    li.className = "line";
    li.dataset.lineId = line.id;
    if (state.tts.playingId === line.id) li.classList.add("is-playing");

    const head = document.createElement("div");
    head.className = "line__head";

    const num = document.createElement("span");
    num.className = "line__num";
    num.textContent = String(index + 1).padStart(2, "0");

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "btn btn--speak";
    speakBtn.setAttribute("aria-label", t("speakLine"));
    speakBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a3.5 3.5 0 0 0-1.9-3.1v6.2A3.5 3.5 0 0 0 16.5 12zM15 5.1v1.7a6.5 6.5 0 0 1 0 10.4v1.7a8.2 8.2 0 0 0 0-13.8z"/></svg><span>${t("speak")}</span>`;
    speakBtn.addEventListener("click", () => {
      state.tts.speak(line.segments, line.id);
    });

    head.append(num, speakBtn);

    const body = document.createElement("div");
    body.className = "line__body";

    line.segments.forEach((seg) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `segment segment--${seg.lang.split("-")[0]}`;
      row.title = `${t("speak")} (${seg.lang})`;
      row.innerHTML = `<span class="segment__lang">${LANG_LABEL[seg.lang] || seg.lang}</span><span class="segment__text">${escapeHtml(seg.text)}</span>`;
      row.addEventListener("click", () => {
        state.tts.speak([seg], `${line.id}:${seg.lang}`);
      });
      body.appendChild(row);
    });

    if (line.hints?.length) {
      const hints = document.createElement("div");
      hints.className = "line__hints";
      line.hints.forEach((h) => {
        const pill = document.createElement("p");
        pill.className = `hint hint--${h.type}`;
        const label = h.type === "ipa" ? t("hintIpa") : t("hintRomaji");
        pill.innerHTML = `<span>${label}</span> ${escapeHtml(h.text)}`;
        hints.appendChild(pill);
      });
      body.appendChild(hints);
    }

    li.append(head, body);
    list.appendChild(li);
  });

  panel.appendChild(list);
  syncPlayingUI();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function syncPlayingUI() {
  const id = state.tts.playingId;
  document.querySelectorAll(".line").forEach((el) => {
    el.classList.toggle("is-playing", el.dataset.lineId === id);
  });
  const badge = $("#status-badge");
  if (id) {
    badge.hidden = false;
    badge.textContent = t("speaking");
  } else {
    badge.hidden = true;
  }
}

/**
 * @param {"all" | string} scope - "all" or a BCP-47 lang tag
 */
function playAll(scope = "all") {
  const track = currentTrack();
  if (!track) return;

  const segments = track.lines.flatMap((line) => line.segments || []);
  const filtered =
    scope === "all" ? segments : segments.filter((seg) => seg.lang === scope);

  if (!filtered.length) return;
  state.tts.speak(filtered, scope === "all" ? "all" : `all:${scope}`);
}

function bindControls() {
  $("#btn-stop").addEventListener("click", () => state.tts.stop());
  $("#rate").addEventListener("input", (e) => {
    state.tts.setRate(e.target.value);
    $("#rate-value").textContent = `${Number(e.target.value).toFixed(1)}×`;
  });

  document.querySelectorAll("[data-ui-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.uiLang = btn.dataset.uiLang;
      localStorage.setItem("plt-ui", state.uiLang);
      applyChromeCopy();
      renderTracks();
      renderPanel();
    });
  });

  $("#cta-start").addEventListener("click", (e) => {
    e.preventDefault();
    $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  state.tts.onStateChange(() => syncPlayingUI());
}

async function boot() {
  applyChromeCopy();
  bindControls();

  if (!state.tts.supported) {
    $("#banner").hidden = false;
    $("#banner").textContent = t("unsupported");
  }

  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(String(res.status));
    state.data = await res.json();
    state.trackId = state.data.tracks[0]?.id ?? null;
    $("#meta-speaker").textContent = state.data.meta.speaker;
    renderTracks();
    renderPanel();
  } catch (err) {
    console.error(err);
    $("#banner").hidden = false;
    $("#banner").textContent = t("loadError");
  }
}

boot();
