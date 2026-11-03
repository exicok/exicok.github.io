import { SITE, url, query, replaceQuery, fmtDate, fmtDateCn, escapeHtml, groupBy, countBy, toast, copyText, mountShell, loadPosts, loadMarkdown, parseFrontmatter, searchPosts, loadSearchData, openSearch, mountComments, mountAnalytics, trackViews, ICONS } from "./app.js";
import { renderMarkdown, countWords, readingMinutes, plainText } from "./md.js";

const main = document.getElementById("main");

function setTitle(title) {
  document.title = title ? `${title} · ${SITE.name}` : `${SITE.name} · ${SITE.tagline}`;
}

function skeleton(count = 3) {
  return Array.from({ length: count }, () => `<div class="skeleton"><div class="l w40"></div><div class="l w90"></div><div class="l w70"></div></div>`).join("");
}

function fail(err) {
  main.innerHTML = `<div class="empty"><h3>出错了</h3><p>${escapeHtml(err.message || String(err))}</p></div>`;
  console.error(err);
}

/* ---------------- 通用片段 ---------------- */

function metaLine(post, opts = {}) {
  const parts = [`<time datetime="${post.date}">${fmtDate(post.date)}</time>`];
  if (post.category) parts.push(`<a class="chip" href="${url("term.html", { type: "category", value: post.category })}">${escapeHtml(post.category)}</a>`);
  if (opts.words && SITE.post.showWordCount && post.words) parts.push(`${post.words} 字 · 约 ${post.minutes} 分钟`);
  return parts.join(`<span class="dot"></span>`);
}

function tagsRow(tags) {
  if (!tags?.length) return "";
  return `<div class="terms">${tags.map((t) => `<a class="chip" href="${url("term.html", { type: "tag", value: t })}">#${escapeHtml(t)}</a>`).join("")}</div>`;
}

// 卡片整体可点，靠标题链接的 ::after 铺满整块（见 CSS 的 .post-card-title a::after），
// 这样 meta 里的分类/标签链接不会被嵌套进同一个 <a> 而破坏解析。
function card(post, opts = { words: true }) {
  return `<li class="post-card">
    <h2 class="post-card-title"><a href="${url("post.html", { id: post.slug })}">${escapeHtml(post.title)}</a></h2>
    <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
    <div class="post-meta">${metaLine(post, opts)}</div>
  </li>`;
}

function filterBar(kind, value, all) {
  const counts = countBy(all, (p) => (kind === "category" ? p.category : p.tags));
  if (counts.length < 2) return "";
  return `<div class="filter-bar"><span class="label">${kind === "category" ? "分类" : "标签"}</span>
    <a class="chip${!value ? " chip-active" : ""}" href="${url("index.html")}">全部 <span class="n">${all.length}</span></a>
    ${counts.map(([name, n]) => `<a class="chip${value === name ? " chip-active" : ""}" href="${url("index.html", kind === "category" ? { category: name } : { tag: name })}">${escapeHtml(name)} <span class="n">${n}</span></a>`).join("")}
  </div>`;
}

/* ---------------- 首页：列表 + 筛选 + 分页 ---------------- */

async function pageHome() {
  const q = query();
  const category = q.get("category") || "";
  const tag = q.get("tag") || "";
  const page = Math.max(1, Number(q.get("page") || 1));
  setTitle(category ? `分类 ${category}` : tag ? `标签 ${tag}` : "");
  const all = await loadPosts();
  let list = all;
  if (category) list = list.filter((p) => p.category === category);
  if (tag) list = list.filter((p) => (p.tags || []).includes(tag));

  const per = SITE.postsPerPage || 8;
  const pages = Math.max(1, Math.ceil(list.length / per));
  const cur = Math.min(page, pages);
  const slice = list.slice((cur - 1) * per, cur * per);

  const heading = category ? `分类：${category}` : tag ? `标签：${tag}` : "全部文章";
  main.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1 class="page-title">${escapeHtml(heading)}</h1>
        <p class="page-sub">${escapeHtml(SITE.description)}<span class="sep">·</span>${all.length} 篇文章</p>
      </div>
      ${filterBar("category", category, all)}
      ${tag ? filterBar("tag", tag, all) : ""}
      ${slice.length ? `<ul class="post-list">${slice.map(card).join("")}</ul>` : `<div class="empty"><h3>这里还空着</h3><p>该筛选条件下没有文章。换个标签，或回<a href="index.html">首页</a>看看全部。</p></div>`}
      ${pages > 1 ? pager(cur, pages, { category, tag }) : ""}
    </div>`;
}

function pager(cur, pages, params) {
  const link = (n) => url("index.html", { ...params, page: n > 1 ? n : "" });
  const nums = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - cur) <= 1) nums.push(`<a class="pager-btn${n === cur ? " is-active" : ""}" href="${link(n)}">${n}</a>`);
    else if (nums[nums.length - 1] !== "…") nums.push(`<span class="pager-info">…</span>`);
  }
  const arrow = (n, label, disabled) =>
    disabled ? `<span class="pager-btn" aria-hidden="true">${label}</span>` : `<a class="pager-btn" href="${link(n)}" aria-label="${label}一页">${label}</a>`;
  return `<nav class="pager" aria-label="分页">
    ${arrow(cur - 1, "←", cur === 1)}
    ${nums.join("")}
    ${arrow(cur + 1, "→", cur === pages)}
    <span class="pager-info">第 ${cur} / ${pages} 页</span>
  </nav>`;
}

/* ---------------- 文章页 ---------------- */

async function pagePost() {
  const slug = query().get("id") || location.hash.replace(/^#/, "");
  main.innerHTML = `<div class="container">${skeleton(2)}</div>`;
  if (!slug) throw new Error("缺少文章标识");
  const all = await loadPosts();
  const idx = all.findIndex((p) => p.slug === slug);
  const meta = idx >= 0 ? all[idx] : null;
  const raw = await loadMarkdown(slug);
  const { meta: fm, body } = parseFrontmatter(raw);
  const { html, toc } = renderMarkdown(body);

  const post = meta || {
    slug, title: fm.title || slug, date: fm.date || "", category: fm.category || "",
    tags: fm.tags || [], excerpt: plainText(body).slice(0, 120),
    words: countWords(body), minutes: readingMinutes(countWords(body)),
  };
  setTitle(post.title);
  setSocialMeta(post);

  const levels = SITE.post.tocLevels || [2, 3, 4];
  const tocItems = toc.filter((t) => levels.includes(t.level));
  const prev = SITE.post.prevNext && idx > 0 ? all[idx - 1] : null;
  const next = SITE.post.prevNext && idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const infoParts = [
    `<span>${fmtDateCn(post.date)}</span>`,
    post.category ? `<a href="${url("term.html", { type: "category", value: post.category })}">${escapeHtml(post.category)}</a>` : "",
    SITE.post.showWordCount && meta ? `<span>${post.words} 字 · 约 ${post.minutes} 分钟</span>` : "",
    SITE.post.showUpdated && post.updated ? `<span>更新于 ${fmtDate(post.updated)}</span>` : "",
    `<span id="views" hidden></span>`,
  ].filter(Boolean);

  main.innerHTML = `
    ${SITE.post.showProgress ? '<div class="progress" id="progress"></div>' : ""}
    <div class="post-shell">
      <article class="post-main">
        <header class="post-header">
          <h1 class="post-title">${escapeHtml(post.title)}</h1>
          <div class="post-info">
            ${infoParts.join('<span class="dot"></span>')}
            ${SITE.post.copyLink ? `<span class="post-actions"><button class="icon-btn" id="copyLink" type="button" title="复制本篇链接">${ICONS.link}</button></span>` : ""}
          </div>
        </header>
        <div class="post-body">${html}</div>
        <footer class="post-foot">${tagsRow(post.tags)}</footer>
        ${prev || next ? `<nav class="post-nav" aria-label="相邻文章">
          ${prev ? `<a class="post-nav-item" href="${url("post.html", { id: prev.slug })}"><span class="k">上一篇</span><span class="t">${escapeHtml(prev.title)}</span></a>` : "<span></span>"}
          ${next ? `<a class="post-nav-item next" href="${url("post.html", { id: next.slug })}"><span class="k">下一篇</span><span class="t">${escapeHtml(next.title)}</span></a>` : ""}
        </nav>` : ""}
        <section class="comments" id="comments"></section>
      </article>
      ${tocItems.length >= 2 ? `<aside class="toc"><p class="toc-title">目录</p><ul class="toc-list">${tocItems.map((t) => `<li><a class="toc-link l${t.level}" href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join("")}</ul></aside>` : ""}
    </div>`;

  enhanceCode();
  if (post.slug) trackViews(post.slug, document.getElementById("views"));
  mountComments(post.slug);
  document.getElementById("copyLink")?.addEventListener("click", async () => {
    await copyText(location.href);
    toast("链接已复制");
  });

  const bar = document.getElementById("progress");
  if (bar) {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      bar.style.width = `${max > 0 ? (el.scrollTop / max) * 100 : 0}%`;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  spyToc();

  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}

function setSocialMeta(post) {
  const link = `${SITE.url.replace(/\/+$/, "")}/${url("post.html", { id: post.slug })}`;
  const set = (attr, key, val) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.content = val;
  };
  set("property", "og:title", post.title);
  set("property", "og:description", post.excerpt || "");
  set("property", "og:type", "article");
  set("property", "og:url", link);
  set("name", "description", post.excerpt || "");
  let c = document.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
  c.href = link;
}

function enhanceCode() {
  main.querySelectorAll(".codeblock").forEach((block) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn sm copy-code";
    btn.textContent = "复制";
    btn.addEventListener("click", async () => {
      const ok = await copyText(block.querySelector("code").innerText);
      btn.textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => (btn.textContent = "复制"), 1600);
    });
    block.appendChild(btn);
  });
}

function spyToc() {
  const links = [...main.querySelectorAll(".toc-link")];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    links.forEach((a) => a.classList.remove("is-active"));
    byId.get(visible[0].target.id)?.classList.add("is-active");
  }, { rootMargin: "-80px 0px -60% 0px" });
  for (const id of byId.keys()) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

/* ---------------- 归档 ---------------- */

async function pageArchive() {
  setTitle("归档");
  const all = await loadPosts();
  const byYear = groupBy(all, (p) => p.date.slice(0, 4));
  main.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1 class="page-title">归档</h1>
        <p class="page-sub">按时间查看全部 ${all.length} 篇文章<span class="sep">·</span>${byYear.size} 个年份</p>
      </div>
      <div class="archive-summary">
        ${countBy(all, (p) => p.category).map(([c, n]) => `<a class="chip" href="${url("term.html", { type: "category", value: c })}">${escapeHtml(c)} <span class="n">${n}</span></a>`).join("")}
      </div>
      ${[...byYear.entries()].map(([year, items]) => `
        <section class="archive-year">
          <h2 class="archive-year-head">${year}<span class="n">${items.length} 篇</span></h2>
          ${[...groupBy(items, (p) => p.date.slice(5, 7)).entries()].map(([month, list]) => `
            <p class="archive-month">${Number(month)} 月</p>
            <ul class="archive-list">${list.map((p) => `<li class="archive-item">
              <time datetime="${p.date}">${fmtDate(p.date).slice(5)}</time>
              <a href="${url("post.html", { id: p.slug })}">${escapeHtml(p.title)}</a>
              <span class="post-meta" style="margin-left:auto"><span class="chip">${escapeHtml(p.category)}</span></span>
            </li>`).join("")}</ul>`).join("")}
        </section>`).join("")}
    </div>`;
}

/* ---------------- 分类 / 标签 ---------------- */

async function pageTerm() {
  const q = query();
  const kind = q.get("type") === "tag" ? "tag" : "category";
  const value = q.get("value") || "";
  const all = await loadPosts();
  const label = kind === "tag" ? "标签" : "分类";
  setTitle(value ? `${label}：${value}` : label);

  if (!value) {
    const counts = countBy(all, (p) => (kind === "tag" ? p.tags : p.category));
    const max = counts[0]?.[1] || 1;
    main.innerHTML = `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">${label}</h1>
          <p class="page-sub">${all.length} 篇文章共 ${counts.length} 个${label}<span class="sep">·</span>${kind === "tag" ? "「标签」可多选，「分类」每篇只有一个" : "每篇文章归入一个分类，想调整请改文章的 frontmatter"}</p>
        </div>
        <ul class="term-grid">
          ${counts.map(([name, n]) => `<li><a class="term-card" href="${url("term.html", { type: kind, value: name })}">
            <span class="name">${kind === "tag" ? "#" : ""}${escapeHtml(name)}</span>
            <span class="n">${n} 篇</span>
            <span class="bar"><i style="width:${Math.round((n / max) * 100)}%"></i></span>
          </a></li>`).join("")}
        </ul>
      </div>`;
    return;
  }

  const list = kind === "tag" ? all.filter((p) => (p.tags || []).includes(value)) : all.filter((p) => p.category === value);
  main.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1 class="page-title">${label}：${escapeHtml(value)}</h1>
        <p class="page-sub">${list.length} 篇<span class="sep">·</span><a href="${url("term.html", { type: kind })}">全部${label}</a><span class="sep">·</span><a href="index.html">全部文章</a></p>
      </div>
      <ul class="post-list">${list.map(card).join("")}</ul>
    </div>`;
}

/* ---------------- 搜索页 ---------------- */

async function pageSearch() {
  setTitle("搜索");
  const q = query();
  const term = q.get("q") || "";
  main.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1 class="page-title">搜索</h1>
        <p class="page-sub">在标题、分类、标签与正文中查找<span class="sep">·</span>快捷键 <span class="kbd">Ctrl</span> + <span class="kbd">K</span></p>
      </div>
      <form class="search-page-form" id="searchForm" role="search">
        <input type="search" id="searchPageInput" placeholder="输入关键词，回车搜索" autocomplete="off" value="${escapeHtml(term)}">
        <button class="btn primary" type="submit">搜索</button>
      </form>
      <div id="searchOut">${term ? "" : '<div class="empty"><h3>输入关键词开始</h3><p>支持中英文、多个词用空格分隔，例如「Rust 所有权」。</p></div>'}</div>
    </div>`;

  const out = document.getElementById("searchOut");
  const input = document.getElementById("searchPageInput");

  const snippet = (h) => {
    const text = h.record.text || h.record.excerpt || "";
    const i = text.toLowerCase().indexOf(h.tokens[0]);
    const start = Math.max(0, (i < 0 ? 0 : i) - 20);
    return `${start > 0 ? "…" : ""}${text.slice(start, start + 120).trim()}…`;
  };

  const run = async (value) => {
    if (!value.trim()) { out.innerHTML = '<div class="empty"><h3>输入关键词开始</h3><p>支持中英文、多个词用空格分隔。</p></div>'; return; }
    const hits = searchPosts(await loadSearchData(), value);
    const head = `<p class="page-sub" style="margin-bottom:14px">${hits.length ? `找到 ${hits.length} 篇` : "没有找到"}关于「${escapeHtml(value)}」的文章</p>`;
    const items = hits.map((h) => card({ ...h.record, excerpt: snippet(h) }, { words: false }));
    const body = hits.length
      ? `<ul class="post-list">${items.join("")}</ul>`
      : '<div class="empty"><h3>换个词试试</h3><p>可以只用其中一部分关键词，或试试英文写法。</p></div>';
    out.innerHTML = head + body;
    replaceQuery({ q: value });
  };
  document.getElementById("searchForm").addEventListener("submit", (e) => { e.preventDefault(); run(input.value); });
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 200); });
  if (term) run(term);
}

/* ---------------- 关于 ---------------- */

async function pageAbout() {
  setTitle("关于");
  const all = await loadPosts();
  const totalWords = all.reduce((s, p) => s + (p.words || 0), 0);
  main.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1 class="page-title">关于</h1>
        <p class="page-sub">${escapeHtml(SITE.tagline)}</p>
      </div>
      <div class="about-grid post-body">
        <p style="display:flex;gap:16px;align-items:center">
          ${SITE.avatar ? `<img class="avatar" src="${escapeHtml(SITE.avatar)}" alt="">` : `<span class="avatar">${escapeHtml((SITE.name || "B").slice(0, 1))}</span>`}
          <span><strong>${escapeHtml(SITE.author || SITE.name)}</strong><br>${escapeHtml(SITE.description)}</span>
        </p>
        <p>这个站点没有框架、没有数据库、也没有构建插件：文章是仓库里的 Markdown 文件，页面由 <code>assets/js/md.js</code> 里那个自研的小解析器在浏览器内渲染。<code>node tools/build.mjs</code> 只做一件事——把文章元数据整理成索引，顺带生成 RSS 与 sitemap。</p>
        <h2>站点现状</h2>
        <ul>
          <li>${all.length} 篇文章，合计约 ${totalWords.toLocaleString("zh-CN")} 字</li>
          <li>${countBy(all, (p) => p.category).length} 个分类、${new Set(all.flatMap((p) => p.tags || [])).size} 个标签</li>
          <li>最早 ${all.length ? fmtDate(all[all.length - 1].date) : "-"}，最近 ${all.length ? fmtDate(all[0].date) : "-"}</li>
        </ul>
        <h2>写作约定</h2>
        <ul>
          <li>文件放在 <code>content/posts/</code>，文件名即文章地址里的标识，用小写字母、数字和连字符。</li>
          <li>标题、日期、分类、标签写在文件开头的 frontmatter 里，日期用 <code>YYYY-MM-DD</code>。</li>
          <li>支持的语法见<a href="${url("post.html", { id: "markdown-syntax-tour" })}">本站 Markdown 语法速查</a>，不确定就用<a href="write.html">写文章页面</a>边写边预览。</li>
          <li>写完跑 <code>node tools/build.mjs</code>，把 <code>data/</code>、<code>feed.xml</code>、<code>sitemap.xml</code> 一起提交。</li>
        </ul>
        ${SITE.social?.length ? `<h2>找到我</h2><ul class="link-list">${SITE.social.map((s) => `<li><a href="${escapeHtml(s.href)}">${escapeHtml(s.label)}<span class="u">${escapeHtml(s.note || "")}</span></a></li>`).join("")}</ul>` : ""}
      </div>
    </div>`;
}

/* ---------------- 路由 ---------------- */

const ROUTES = {
  index: pageHome,
  post: pagePost,
  archive: pageArchive,
  term: pageTerm,
  search: pageSearch,
  about: pageAbout,
  "404": async () => {
    setTitle("页面不存在");
    main.innerHTML = `<div class="container"><div class="not-found"><div class="code">404</div>
      <p>这个地址下没有页面。可以直接搜索，或从<a href="index.html">文章列表</a>开始。</p>
      <p><button class="btn primary" type="button" id="from404">打开搜索</button></p></div></div>`;
    document.getElementById("from404").addEventListener("click", () => openSearch());
  },
};

addEventListener("DOMContentLoaded", async () => {
  mountShell();
  mountAnalytics();
  const page = document.body.dataset.page || "index";
  try {
    await (ROUTES[page] || ROUTES.index)();
  } catch (err) {
    fail(err);
  }
});
