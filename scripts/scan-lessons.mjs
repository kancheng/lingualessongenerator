/**
 * Scan data/lessons/*.json and build a lesson catalog (no manual manifest edits).
 * manifest.json itself is ignored as a lesson file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const LESSONS_DIR = path.join(ROOT, "data", "lessons");
export const MANIFEST_PATH = path.join(LESSONS_DIR, "manifest.json");

const PREFERRED_DEFAULT = "interview-self-intro";

/**
 * @param {string} [lessonsDir]
 */
export function scanLessons(lessonsDir = LESSONS_DIR) {
  fs.mkdirSync(lessonsDir, { recursive: true });

  const files = fs
    .readdirSync(lessonsDir)
    .filter((name) => name.endsWith(".json") && name !== "manifest.json")
    .sort((a, b) => a.localeCompare(b));

  const lessons = [];

  for (const file of files) {
    const id = file.replace(/\.json$/i, "");
    let title = { zh: id, en: id };
    let speaker = "";

    try {
      const data = JSON.parse(fs.readFileSync(path.join(lessonsDir, file), "utf8"));
      if (data?.meta?.title && typeof data.meta.title === "object") {
        title = {
          zh: data.meta.title.zh || id,
          en: data.meta.title.en || data.meta.title.zh || id,
        };
      }
      if (typeof data?.meta?.speaker === "string") speaker = data.meta.speaker;
    } catch {
      // keep filename-based meta
    }

    lessons.push({ id, file, title, speaker });
  }

  let defaultId = "";
  if (lessons.some((l) => l.id === PREFERRED_DEFAULT)) {
    defaultId = PREFERRED_DEFAULT;
  } else if (lessons[0]) {
    defaultId = lessons[0].id;
  }

  return {
    version: "1.0",
    directory: "data/lessons",
    scanned: true,
    default: defaultId,
    lessons,
  };
}

/**
 * Write scanned catalog to manifest.json (for static hosts / build).
 * @param {string} [lessonsDir]
 */
export function writeManifest(lessonsDir = LESSONS_DIR) {
  const manifest = scanLessons(lessonsDir);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const manifest = writeManifest();
  console.log(
    `Scanned ${manifest.lessons.length} lesson(s); default=${manifest.default || "(none)"}`
  );
  for (const l of manifest.lessons) {
    console.log(`  - ${l.file}`);
  }
}
