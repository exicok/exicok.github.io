import { SITE } from "./site-config.js";

export const THEME_KEY = "exicok-theme";
export { SITE };

/* ============================ 小工具 ============================ */

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// 拼站内链接：所有页面都在仓库根目录，用相对路径，兼容用户站与项目站两种 Pages。
export function url(path, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) q.set(k, v);
  const s = q.toString();
  return `${path}${s ? `?${s}` : ""}`;
}

export function query() {
  return new URLSearchParams(location.search);
}

export function replaceQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) q.set(k, v);
  const s = q.toString();
  history.replaceState(null, "", `${location.pathname}${s ? `?${s}` : ""}${location.hash}`);
}

export function fmtDate(iso, withTime = false) {
  const d = new Date(`${iso}T${withTime ? "00:00:00" : "00:00:00"}`);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDateCn(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function countBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    for (const key of [].concat(keyFn(item)).filter(Boolean)) map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "zh"));
}

let toastHost;
export function toast(message) {
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    document.body.appendChild(toastHost);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  toastHost.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/* ============================ 主题 ============================ */

const mq = window.matchMedia("(prefers-color-scheme: dark)");

export function storedTheme() {
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "auto" ? v : SITE.defaultTheme || "auto";
}

export function effectiveTheme(pref = storedTheme()) {
  return pref === "auto" ? (mq.matches ? "dark" : "light") : pref;
}

export function applyTheme(pref) {
  document.documentElement.dataset.theme = effectiveTheme(pref);
  document.documentElement.dataset.themePref = pref;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = effectiveTheme(pref);
}

function cycleTheme() {
  const order = ["auto", "light", "dark"];
  const next = order[(order.indexOf(storedTheme()) + 1) % order.length];
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  syncThemeButton();
  document.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  toast(`主题：${next === "auto" ? "跟随系统" : next === "dark" ? "深色" : "浅色"}`);
}

function syncThemeButton() {
  const btn = document.getElementById("themeBtn");
  if (!btn) return;
  const pref = storedTheme();
  const dark = effectiveTheme() === "dark";
  btn.innerHTML = pref === "auto" ? ICONS.auto : dark ? ICONS.moon : ICONS.sun;
  btn.title = `主题：${pref === "auto" ? "跟随系统" : pref === "dark" ? "深色" : "浅色"}（点击切换）`;
  btn.setAttribute("aria-label", btn.title);
}

mq.addEventListener?.("change", () => {
  if (storedTheme() === "auto") { applyTheme("auto"); syncThemeButton(); }
});

/* ============================ 图标 ============================ */

const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;

export const ICONS = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/>'),
  auto: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  rss: svg('<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/>'),
  chevLeft: svg('<path d="m14 6-6 6 6 6"/>'),
  chevRight: svg('<path d="m10 6 6 6-6 6"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
  download: svg('<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/>'),
};

/* ============================ 外壳（导航 / 页脚） ============================ */

function currentPage() {
  const name = location.pathname.split("/").pop() || "index.html";
  return name === "" ? "index.html" : name;
}

function isActive(href, page, q) {
  const [h, qs] = href.split("?");
  const active = h === page;
  if (!active || !qs) return active;
  const type = new URLSearchParams(qs).get("type");
  return !type || type === (q.get("type") || "category");
}

export function mountShell() {
  const page = currentPage();
  const q = query();
  const brand = SITE.avatar
    ? `<img class="brand-mark" src="${escapeHtml(SITE.avatar)}" alt="">`
    : `<span class="brand-mark">${escapeHtml((SITE.name || "B").slice(0, 1))}</span>`;

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="index.html">${brand}<span>${escapeHtml(SITE.name)}<i class="brand-dot">.</i></span></a>
      <nav class="nav-links" id="navLinks" aria-label="主导航">
        ${SITE.nav.map((n) => `<a class="nav-link${isActive(n.href, page, q) ? " is-active" : ""}" href="${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        <button class="icon-btn" id="searchBtn" type="button" title="搜索（Ctrl+K）" aria-label="搜索">${ICONS.search}</button>
        <button class="icon-btn" id="themeBtn" type="button"></button>
        <button class="icon-btn nav-toggle" id="navToggle" type="button" aria-label="打开菜单" aria-expanded="false">${ICONS.menu}</button>
      </div>
    </div>`;
  document.body.prepend(header);

  const year = new Date().getFullYear();
  const since = SITE.footer?.since || year;
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-inner">
      <div>© ${since === year ? year : `${since} – ${year}`} ${escapeHtml(SITE.author || SITE.name)}
        ${SITE.footer?.note ? ` · ${escapeHtml(SITE.footer.note)}` : ""}</div>
      <div class="footer-links">
        ${(SITE.footer?.links || []).map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join("")}
        <a href="write.html">写文章</a>
      </div>
    </div>`;
  document.body.appendChild(footer);

  syncThemeButton();
  header.querySelector("#themeBtn").addEventListener("click", cycleTheme);
  header.querySelector("#searchBtn").addEventListener("click", openSearch);
  const toggle = header.querySelector("#navToggle");
  const links = header.querySelector("#navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (links.classList.contains("open") && !links.contains(e.target) && e.target !== toggle) links.classList.remove("open");
  });
}

/* ============================ 数据 ============================ */

let postsCache = null;
let searchCache = null;

export async function loadPosts() {
  if (postsCache) return postsCache;
  const res = await fetch(url("data/posts.json"), { cache: "no-cache" });
  if (!res.ok) throw new Error(`读取文章索引失败：${res.status}`);
  postsCache = (await res.json()).filter((p) => !p.draft);
  return postsCache;
}

export async function loadRawIndex() {
  const res = await fetch(url("data/posts.json"), { cache: "no-cache" });
  if (!res.ok) throw new Error(`读取文章索引失败：${res.status}`);
  return res.json();
}

export async function loadSearchData() {
  if (searchCache) return searchCache;
  const res = await fetch(url("data/search.json"), { cache: "no-cache" });
  if (!res.ok) throw new Error(`读取搜索索引失败：${res.status}`);
  searchCache = await res.json();
  return searchCache;
}

export async function loadMarkdown(slug) {
  const res = await fetch(url(`content/posts/${encodeURIComponent(slug)}.md`), { cache: "no-cache" });
  if (!res.ok) throw new Error(`文章不存在：${slug}`);
  return res.text();
}

// 解析站点自用的 frontmatter 子集（与 tools/build.mjs 保持一致）。
export function parseFrontmatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!m) return { meta, body: String(text) };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim().replace(/^["']|["']$/g, "");
    if (value.startsWith("[")) value = value.slice(1, -1);
    meta[key] = key === "tags"
      ? value.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : value;
  }
  return { meta, body: String(text).slice(m[0].length) };
}

/* ============================ 搜索 ============================ */

function tokenize(queryString) {
  return queryString.toLowerCase().split(/[\s,，、]+/).filter(Boolean);
}

function windowAround(text, token, len) {
  const idx = text.toLowerCase().indexOf(token);
  if (idx < 0) return text.slice(0, len);
  const start = Math.max(0, idx - Math.floor(len / 3));
  const end = Math.min(text.length, start + len);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function markHits(text, tokens) {
  let out = escapeHtml(text);
  for (const t of tokens) {
    if (!t) continue;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    out = out.replace(re, "<mark>$1</mark>");
  }
  return out;
}

export function searchPosts(records, queryString) {
  const tokens = tokenize(queryString);
  if (!tokens.length) return [];
  const results = [];
  for (const r of records) {
    const title = (r.title || "").toLowerCase();
    const tags = (r.tags || []).join(" ").toLowerCase();
    const cat = (r.category || "").toLowerCase();
    const excerpt = (r.excerpt || "").toLowerCase();
    const text = (r.text || "").toLowerCase();
    let score = 0;
    let matched = true;
    for (const t of tokens) {
      let hit = 0;
      if (title.includes(t)) { hit += 9; if (title === t) hit += 6; }
      if (tags.includes(t)) hit += 6;
      if (cat.includes(t)) hit += 5;
      if (excerpt.includes(t)) hit += 3;
      const inBody = text.split(t).length - 1;
      hit += Math.min(inBody, 4);
      if (!hit) { matched = false; break; }
      score += hit;
    }
    if (!matched) continue;
    results.push({ record: r, score, tokens });
  }
  results.sort((a, b) => b.score - a.score || (a.record.date < b.record.date ? 1 : -1));
  return results.slice(0, 20);
}

/* 搜索面板：任意页面按 Ctrl+K / / 呼出 */
let overlayEl = null;
let cursor = 0;
let currentResults = [];

function closeSearch() {
  overlayEl?.remove();
  overlayEl = null;
  document.body.style.overflow = "";
}

async function runSearch(queryString) {
  const box = overlayEl?.querySelector("#searchResults");
  if (!box) return;
  if (!queryString.trim()) { box.innerHTML = suggestionList(); return; }
  const records = await loadSearchData();
  const hits = searchPosts(records, queryString);
  currentResults = hits;
  cursor = 0;
  if (!hits.length) {
    box.innerHTML = `<li class="search-item"><div class="search-item-title">没有匹配「${escapeHtml(queryString)}」的文章</div><div class="search-item-snip">换个关键词试试，或用同义词、英文原文。</div></li>`;
    return;
  }
  const len = SITE.searchSnippetLength || 88;
  box.innerHTML = hits.map((h, i) => {
    const r = h.record;
    const snip = windowAround(r.text || r.excerpt || "", h.tokens[0], len);
    return `<li><a class="search-item${i === 0 ? " is-cursor" : ""}" href="${escapeHtml(url("post.html", { id: r.slug }))}" data-i="${i}">
      <div class="search-item-title">${markHits(r.title, h.tokens)}</div>
      <div class="search-item-snip">${markHits(snip, h.tokens)}</div>
      <div class="search-item-meta">${fmtDate(r.date)} · ${escapeHtml(r.category || "未分类")}${r.tags?.length ? ` · ${r.tags.map(escapeHtml).join(" / ")}` : ""}</div>
    </a></li>`;
  }).join("");
}

function suggestionList() {
  const cats = (postsCache || []).slice(0, 0);
  void cats;
  const recent = (postsCache || []).slice(0, 5);
  if (!recent.length) return `<li class="search-item"><div class="search-item-snip">正在载入索引…</div></li>`;
  return recent.map((p) => `<li><a class="search-item" href="${escapeHtml(url("post.html", { id: p.slug }))}">
    <div class="search-item-title">${escapeHtml(p.title)}</div>
    <div class="search-item-meta">最近文章 · ${fmtDate(p.date)}</div></a></li>`).join("");
}

export function openSearch(preset = "") {
  if (overlayEl) { overlayEl.querySelector(".search-input").focus(); return; }
  overlayEl = document.createElement("div");
  overlayEl.className = "overlay";
  overlayEl.setAttribute("role", "dialog");
  overlayEl.setAttribute("aria-modal", "true");
  overlayEl.setAttribute("aria-label", "站内搜索");
  overlayEl.innerHTML = `
    <div class="search-panel">
      <div class="search-row">${ICONS.search}
        <input class="search-input" type="search" placeholder="搜索标题、标签、分类与正文…" autocomplete="off" spellcheck="false" aria-label="搜索关键词">
        <button class="btn sm ghost" type="button" id="searchClose">关闭</button>
      </div>
      <ul class="search-results" id="searchResults"></ul>
      <div class="search-foot">
        <span><span class="kbd">↑</span> <span class="kbd">↓</span> 选择</span>
        <span><span class="kbd">Enter</span> 打开</span>
        <span><span class="kbd">Esc</span> 关闭</span>
        <span style="margin-left:auto">共 ${(postsCache || []).length} 篇</span>
      </div>
    </div>`;
  document.body.appendChild(overlayEl);
  document.body.style.overflow = "hidden";
  const input = overlayEl.querySelector(".search-input");
  input.value = preset;
  input.focus();
  overlayEl.querySelector("#searchResults").innerHTML = suggestionList();
  if (preset) runSearch(preset);

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(input.value), 120);
  });
  overlayEl.querySelector("#searchClose").addEventListener("click", closeSearch);
  overlayEl.addEventListener("mousedown", (e) => { if (e.target === overlayEl) closeSearch(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSearch(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...overlayEl.querySelectorAll(".search-item")];
      if (!items.length) return;
      cursor = (cursor + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("is-cursor", i === cursor));
      items[cursor].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      const items = [...overlayEl.querySelectorAll(".search-item")];
      const target = items[cursor] || items[0];
      if (target) location.href = target.getAttribute("href");
    }
  });
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
  if (e.key === "Escape" && overlayEl) closeSearch();
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (e.key === "/" && !typing) { e.preventDefault(); openSearch(); }
});

/* ============================ 第三方：评论 / 统计 ============================ */

export function mountComments(pathId) {
  const c = SITE.comments;
  const host = document.getElementById("comments");
  if (!host) return;
  if (!c.enabled || !c.repoId || !c.categoryId) {
    host.innerHTML = `<h2>评论</h2><div class="notice">评论区尚未启用。在 <code>assets/js/site-config.js</code> 中把 <code>comments.enabled</code> 设为 true，
      并填入 Giscus 的 <code>repoId</code>、<code>category</code>、<code>categoryId</code>（需先在仓库开启 Discussions 并安装 Giscus App）。
      ${c.enabled ? "" : ""}当前文章标识：<code>${escapeHtml(pathId)}</code></div>`;
    return;
  }
  const build = (theme) => {
    host.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    Object.entries({
      "data-repo": c.repo,
      "data-repo-id": c.repoId,
      "data-category": c.category,
      "data-category-id": c.categoryId,
      "data-mapping": c.mapping || "pathname",
      "data-strict": "0",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": theme,
      "data-lang": c.lang || "zh-CN",
      "data-loading": "lazy",
      crossorigin: "anonymous",
      lang: c.lang || "zh-CN",
    }).forEach(([k, v]) => s.setAttribute(k, v));
    host.appendChild(s);
  };
  build(effectiveTheme() === "dark" ? c.darkTheme : c.lightTheme);
  document.addEventListener("themechange", (e) => {
    build(e.detail === "auto" ? (effectiveTheme() === "dark" ? c.darkTheme : c.lightTheme) : e.detail === "dark" ? c.darkTheme : c.lightTheme);
  });
}

export function mountAnalytics() {
  const a = SITE.analytics;
  if (!a || a.provider === "gtag" && a.gtag.measurementId) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.gtag.measurementId)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args) => window.dataLayer.push(...args);
    window.gtag("js", new Date());
    window.gtag("config", a.gtag.measurementId);
  } else if (a && a.provider === "umami" && a.umami.websiteId) {
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = a.umami.scriptUrl;
    s.setAttribute("data-website-id", a.umami.websiteId);
    document.head.appendChild(s);
  }
}

// 每篇文章的浏览量；provider 为 none 时直接隐藏元素，不发出请求。
export async function trackViews(slug, el) {
  const a = SITE.analytics;
  if (!el) return;
  if (!a || a.provider === "none") { el.remove(); return; }
  if (a.provider === "abacus" && a.abacus.user) {
    try {
      const res = await fetch(`https://abacus.jasoncameron.dev/hit/${encodeURIComponent(a.abacus.user)}/${encodeURIComponent(a.abacus.collection)}/${encodeURIComponent(slug)}`);
      const data = await res.json();
      el.innerHTML = `<span class="view-count">${Number(data.value ?? 0)}</span> 次浏览`;
      el.hidden = false;
    } catch { el.remove(); }
  }
}

export function markNavActive() {
  syncThemeButton();
}
