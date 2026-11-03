#!/usr/bin/env node
// 零依赖索引生成器：扫描 content/posts/*.md，产出 data/posts.json、data/search.json、feed.xml、sitemap.xml。
//   node tools/build.mjs            生成（默认排除 draft: true 的文章）
//   node tools/build.mjs --drafts   本地预览时把草稿也写进索引
//   node tools/build.mjs --check    只校验已提交的产物是否过期（CI 用，过期则退出码 1）
// 新增文章后必须跑一次并连同产物一起提交，GitHub Pages 才能立刻看到新文章。

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown, plainText, countWords, readingMinutes, escapeXml } from "../assets/js/md.js";
import { SITE } from "../assets/js/site-config.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "content", "posts");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const WITH_DRAFTS = args.includes("--drafts");

/* 与 assets/js/app.js 的 parseFrontmatter 对应，但会校验字段 */
function parseFrontmatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`${file}: 缺少 frontmatter（文件第一行应为 ---）`);
  const meta = {};
  const ALLOWED = new Set(["title", "date", "updated", "category", "tags", "draft", "excerpt", "cover"]);
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) throw new Error(`${file}: frontmatter 不支持注释或空行 —— ${line}`);
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) throw new Error(`${file}: 无法解析的 frontmatter 行 —— ${line}`);
    const key = kv[1];
    if (!ALLOWED.has(key)) throw new Error(`${file}: 不支持的字段 ${key}`);
    let value = kv[2].trim().replace(/^["']|["']$/g, "");
    if (value.startsWith("[")) value = value.slice(1, -1);
    meta[key] = key === "tags"
      ? value.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : value;
  }
  if (!meta.title) throw new Error(`${file}: 缺少 title`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date || "")) throw new Error(`${file}: date 必须是 YYYY-MM-DD，当前为「${meta.date}」`);
  if (meta.updated && !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) throw new Error(`${file}: updated 必须是 YYYY-MM-DD`);
  if (meta.category && meta.category.includes(":")) throw new Error(`${file}: category 不能包含冒号`);
  meta.draft = /^(true|1|yes)$/i.test(meta.draft || "");
  return { meta, body: raw.slice(m[0].length) };
}

function isoDate(value, time = false) {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`日期无法解析：${value}`);
  return time ? d.toISOString() : value;
}

async function main() {
  const site = SITE;
  const base = String(site.url || "https://example.com").replace(/\/+$/, "");
  if (!existsSync(POSTS_DIR)) throw new Error(`找不到文章目录：${POSTS_DIR}`);

  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".md")).sort();
  const posts = [];
  for (const file of files) {
    const slug = file.slice(0, -3);
    if (!/^[\w.-]+$/.test(slug) || slug !== slug.toLowerCase()) {
      throw new Error(`${file}: 文件名需为小写字母/数字/连字符组成的 slug`);
    }
    const raw = await readFile(join(POSTS_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw, file);
    const { html, toc } = renderMarkdown(body);
    const text = plainText(body);
    const words = countWords(body);
    posts.push({
      slug,
      title: meta.title,
      date: meta.date,
      updated: meta.updated || "",
      category: meta.category || "未分类",
      tags: meta.tags || [],
      draft: meta.draft,
      excerpt: meta.excerpt || `${text.slice(0, 76)}${text.length > 76 ? "…" : ""}`,
      words,
      minutes: readingMinutes(words),
      headings: toc.length,
      file: `content/posts/${file}`,
      path: `post.html?id=${encodeURIComponent(slug)}`,
      html,
      text,
    });
  }

  const visible = posts.filter((p) => WITH_DRAFTS ? true : !p.draft);
  visible.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));

  const metaOnly = visible.map(({ html, text, ...rest }) => rest);
  const search = visible.map(({ slug, title, category, tags, excerpt, date, text }) => ({ slug, title, category, tags, excerpt, date, text: text.slice(0, 20000) }));

  const newest = visible.reduce((acc, p) => (p.updated || p.date) > acc ? p.updated || p.date : acc, "");
  const feed = buildFeed(site, base, visible, newest);
  const sitemap = buildSitemap(site, base, visible);

  const outputs = new Map([
    ["data/posts.json", `${JSON.stringify(metaOnly, null, 2)}\n`],
    ["data/search.json", `${JSON.stringify(search, null, 2)}\n`],
    ["feed.xml", feed],
    ["sitemap.xml", sitemap],
  ]);

  if (CHECK) {
    let stale = [];
    for (const [rel, content] of outputs) {
      const current = await readFile(join(ROOT, rel), "utf8").catch(() => null);
      if (current !== content) stale.push(rel);
    }
    if (stale.length) {
      console.error(`索引已过期，请运行 node tools/build.mjs 后提交：\n  ${stale.join("\n  ")}`);
      process.exit(1);
    }
    console.log(`索引与 ${visible.length} 篇文章一致。`);
    return;
  }

  for (const [rel, content] of outputs) {
    const target = join(ROOT, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  const cats = new Map();
  for (const p of visible) cats.set(p.category, (cats.get(p.category) || 0) + 1);
  console.log(`已生成 ${visible.length} 篇文章索引${posts.length - visible.length ? `（跳过 ${posts.length - visible.length} 篇草稿）` : ""}`);
  console.log(`分类：${[...cats.keys()].join("、")}`);
  console.log("输出：data/posts.json, data/search.json, feed.xml, sitemap.xml");
}

// CDATA 里出现 ]]> 会提前结束段落，正文含代码块时概率不低，这里做安全拆分。
function cdata(html) {
  return `<![CDATA[${html.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

function buildFeed(site, base, posts, newest) {
  // 用最新文章日期而非构建时刻，保证同内容同输出，--check 与自动构建才不会反复产生差异。
  const now = newest ? new Date(`${newest}T12:00:00`).toUTCString() : new Date().toUTCString();
  const items = posts.slice(0, 30).map((p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/${p.path}</link>
      <guid isPermaLink="true">${base}/${p.path}</guid>
      <pubDate>${new Date(`${p.date}T12:00:00`).toUTCString()}</pubDate>
      ${p.updated ? `<lastBuildDate>${new Date(`${p.updated}T12:00:00`).toUTCString()}</lastBuildDate>` : ""}
      <category>${escapeXml(p.category)}</category>
      ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")}
      <description>${escapeXml(p.excerpt)}</description>
      <content:encoded>${cdata(p.html)}</content:encoded>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${base}/index.html</link>
    <description>${escapeXml(site.description || site.tagline || "")}</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>tools/build.mjs</generator>
    <managingEditor>${base}/about.html (${escapeXml(site.author || site.name)})</managingEditor>
    <webMaster>${base}/about.html (${escapeXml(site.author || site.name)})</webMaster>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function buildSitemap(site, base, posts) {
  const pages = ["index.html", "archive.html", "term.html?type=category", "term.html?type=tag", "about.html", "search.html", "write.html"];
  const urls = pages.map((p) => `  <url><loc>${base}/${p.replace(/&/g, "&amp;")}</loc><changefreq>weekly</changefreq></url>`);
  urls.push(`  <url><loc>${base}/404.html</loc><changefreq>never</changefreq></url>`);
  for (const p of posts) {
    urls.push(`  <url><loc>${base}/${p.path.replace(/&/g, "&amp;")}</loc><lastmod>${p.updated || p.date}</lastmod><changefreq>monthly</changefreq></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

main().catch((err) => {
  console.error(`构建失败：${err.message}`);
  process.exit(1);
});
