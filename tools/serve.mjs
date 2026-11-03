#!/usr/bin/env node
// 本地预览：node tools/serve.mjs [端口]
// 浏览器的 ES Module 与 fetch 不能走 file://，因此本地必须用这个静态服务器打开站点。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const raw = (req.url || "/").split("?")[0];
  const path = decodeURIComponent(raw.startsWith("/") ? raw : `/${raw}`);
  const target = join(ROOT, normalize(path === "/" ? "/index.html" : path));
  if (!target.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }
  const candidates = extname(target) ? [target] : [target, join(target, "index.html")];
  for (const file of candidates) {
    const body = await readFile(file).catch(() => null);
    if (body) {
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      return res.end(body);
    }
  }
  const notFound = await readFile(join(ROOT, "404.html")).catch(() => Buffer.from("Not found"));
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
  res.end(notFound);
}).listen(PORT, () => console.log(`本地预览：http://localhost:${PORT}/`));
