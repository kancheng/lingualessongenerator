/**
 * Static server with live lesson scan for data/lessons/manifest.json.
 * Drop any *.json into data/lessons/ and refresh — no manual manifest edits.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, scanLessons } from "./scan-lessons.mjs";

const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^([/\\])+/, "");
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";

  // Live catalog: every request re-scans data/lessons/*.json
  if (
    urlPath === "/data/lessons/manifest.json" ||
    urlPath.startsWith("/data/lessons/manifest.json?")
  ) {
    try {
      const manifest = scanLessons();
      const body = JSON.stringify(manifest, null, 2);
      send(res, 200, body, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
    } catch (err) {
      send(res, 500, JSON.stringify({ error: String(err) }), {
        "Content-Type": "application/json; charset=utf-8",
      });
    }
    return;
  }

  let filePath = safeJoin(ROOT, urlPath === "/" ? "/index.html" : urlPath);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 404, "Not found");
        return;
      }
      send(res, 200, data, { "Content-Type": contentType(filePath) });
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`polyLinguatts at http://${HOST}:${PORT}`);
  console.log("Lessons auto-scanned from data/lessons/*.json on each page load");
});
