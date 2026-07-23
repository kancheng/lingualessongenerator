/**
 * Lesson catalog: load from data/lessons/manifest.json (+ optional localStorage).
 */

export const LESSONS_DIR = "./data/lessons";
export const MANIFEST_URL = `${LESSONS_DIR}/manifest.json`;
export const LOCAL_LESSONS_KEY = "plt-custom-lessons";

/**
 * @typedef {{ id: string, file?: string, title: { zh?: string, en?: string }, speaker?: string, source?: "file"|"local" }} LessonMeta
 * @typedef {{ version: string, directory: string, default: string, lessons: LessonMeta[] }} Manifest
 */

/** @returns {Record<string, object>} */
export function readLocalLessons() {
  try {
    const raw = localStorage.getItem(LOCAL_LESSONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, object>} map */
export function writeLocalLessons(map) {
  localStorage.setItem(LOCAL_LESSONS_KEY, JSON.stringify(map));
}

/**
 * @param {string} id
 * @param {object} data
 */
export function saveLocalLesson(id, data) {
  const map = readLocalLessons();
  map[id] = data;
  writeLocalLessons(map);
}

/** @param {string} id */
export function deleteLocalLesson(id) {
  const map = readLocalLessons();
  delete map[id];
  writeLocalLessons(map);
}

/** @returns {Promise<Manifest>} */
export async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

/**
 * Merge file-backed lessons with browser-local custom lessons.
 * @param {Manifest} manifest
 * @returns {LessonMeta[]}
 */
export function listAllLessons(manifest) {
  const fileLessons = (manifest.lessons || []).map((l) => ({
    ...l,
    source: "file",
  }));

  const local = readLocalLessons();
  const localMetas = Object.entries(local).map(([id, data]) => ({
    id,
    source: "local",
    title: data?.meta?.title ?? { zh: id, en: id },
    speaker: data?.meta?.speaker ?? "",
  }));

  const seen = new Set(fileLessons.map((l) => l.id));
  const extras = localMetas.filter((l) => !seen.has(l.id));
  return [...fileLessons, ...extras];
}

/**
 * @param {Manifest} manifest
 * @param {string} id
 */
export async function loadLessonById(manifest, id) {
  // Packaged files always win over browser-local drafts with the same id.
  const entry = (manifest.lessons || []).find((l) => l.id === id);
  if (entry || !readLocalLessons()[id]) {
    const file = entry?.file || `${id}.json`;
    const res = await fetch(`${LESSONS_DIR}/${file}`);
    if (res.ok) return res.json();
    if (entry) throw new Error(`lesson ${file} ${res.status}`);
  }

  const local = readLocalLessons();
  if (local[id]) return structuredClone(local[id]);

  throw new Error(`Unknown lesson: ${id}`);
}

/**
 * Resolve initial lesson id: ?lesson=… → stored → manifest.default → first.
 * @param {Manifest} manifest
 * @param {LessonMeta[]} catalog
 */
export function resolveDefaultLessonId(manifest, catalog) {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("lesson");
  if (fromQuery && catalog.some((l) => l.id === fromQuery)) return fromQuery;

  const stored = localStorage.getItem("plt-lesson");
  if (stored && catalog.some((l) => l.id === stored)) return stored;

  if (manifest.default && catalog.some((l) => l.id === manifest.default)) {
    return manifest.default;
  }

  return catalog[0]?.id ?? null;
}

/**
 * Trigger browser download of a lesson JSON file.
 * @param {object} data
 * @param {string} filename
 */
export function downloadLessonJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Slugify a lesson id from title text.
 * @param {string} text
 */
export function slugifyId(text) {
  const base = String(text || "custom-lesson")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `lesson-${Date.now().toString(36)}`;
}
