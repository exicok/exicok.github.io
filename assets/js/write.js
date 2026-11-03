import { escapeHtml, toast, copyText, mountShell, loadRawIndex, loadMarkdown, parseFrontmatter, ICONS } from "./app.js";
import { renderMarkdown, countWords, readingMinutes, slugify } from "./md.js";

const DRAFT_KEY = "exicok-drafts";
const main = document.getElementById("main");

const state = {
  slug: "",
  dir: null,        // File System Access API 目录句柄
  known: [],        // 已有文章元数据
  tags: [],
};

main.innerHTML = `
  <div class="container wide" style="margin-bottom:22px">
    <div class="page-head">
      <h1 class="page-title">写文章</h1>
      <p class="page-sub">左侧填信息，右侧写正文，预览用的就是站点线上那个解析器<span class="sep">·</span><span class="kbd">Ctrl</span>+<span class="kbd">S</span> 导出<span class="sep">·</span>内容只存在你自己的浏览器里</p>
    </div>
  </div>
  <div class="editor-shell">
    <div style="display:grid;gap:16px">
      <section class="panel">
        <h2 class="panel-head">文章信息</h2>
        <div class="panel-body">
          <div class="field">
            <label for="fTitle">标题</label>
            <input id="fTitle" type="text" placeholder="今天想写点什么" autocomplete="off">
          </div>
          <div class="field">
            <label for="fSlug">标识 <span class="hint">用于网址，小写字母/数字/连字符</span></label>
            <input id="fSlug" type="text" placeholder="留空则按标题自动生成" autocomplete="off" spellcheck="false">
          </div>
          <div class="field-row">
            <div class="field"><label for="fDate">日期</label><input id="fDate" type="text" autocomplete="off"></div>
            <div class="field"><label for="fUpdated">更新 <span class="hint">可留空</span></label><input id="fUpdated" type="text" autocomplete="off"></div>
          </div>
          <div class="field">
            <label for="fCategory">分类 <span class="hint">每篇一个，可直接输入新分类</span></label>
            <input id="fCategory" type="text" list="catList" placeholder="技术" autocomplete="off">
            <datalist id="catList"></datalist>
          </div>
          <div class="field">
            <label for="fTagInput">标签 <span class="hint">回车或逗号确认</span></label>
            <div class="chips-input" id="chipsBox">
              <input id="fTagInput" type="text" placeholder="Rust" autocomplete="off">
            </div>
          </div>
          <div class="field">
            <label for="fExcerpt">摘要 <span class="hint">显示在列表页，留空则自动截取正文</span></label>
            <textarea id="fExcerpt" rows="3" placeholder="一句话说清这篇讲什么"></textarea>
          </div>
          <label class="draft-flag"><input type="checkbox" id="fDraft"> 草稿（不会进入索引与 RSS）</label>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-head">${ICONS.folder} 存储方式</h2>
        <div class="panel-body">
          <p class="dir-status" id="dirStatus">未连接仓库目录。连接后可直接把 .md 写进 <code>content/posts/</code>；不连接也能导出文件自行放置。</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" type="button" id="btnPickDir">选择博客目录</button>
            <button class="btn sm ghost" type="button" id="btnUnload" hidden>断开</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-head">已有文章</h2>
        <ul class="post-picker" id="postPicker"><li style="padding:9px 4px;color:var(--text-faint);font-size:.84rem">载入中…</li></ul>
      </section>

      <section class="panel">
        <h2 class="panel-head">本地草稿</h2>
        <ul class="post-picker" id="draftPicker"></ul>
      </section>
    </div>

    <section class="panel editor-main">
      <div class="toolbar">
        <button type="button" data-act="bold" title="加粗 Ctrl+B"><b>B</b></button>
        <button type="button" data-act="italic" title="斜体 Ctrl+I"><i>I</i></button>
        <button type="button" data-act="strike" title="删除线"><s>S</s></button>
        <button type="button" data-act="code" title="行内代码">&#96;</button>
        <span class="divider"></span>
        <button type="button" data-act="h2" title="二级标题">H2</button>
        <button type="button" data-act="h3" title="三级标题">H3</button>
        <button type="button" data-act="quote" title="引用">&rdquo;</button>
        <button type="button" data-act="ul" title="无序列表">&bull;</button>
        <button type="button" data-act="ol" title="有序列表">1.</button>
        <button type="button" data-act="task" title="任务清单">[]</button>
        <span class="divider"></span>
        <button type="button" data-act="link" title="链接 Ctrl+K">&#128279;</button>
        <button type="button" data-act="image" title="图片">&#9635;</button>
        <button type="button" data-act="table" title="表格">&#9638;</button>
        <button type="button" data-act="fence" title="代码块">&lcub;&#125;</button>
        <button type="button" data-act="hr" title="分割线">&mdash;</button>
        <div class="editor-modes">
          <button type="button" data-mode="write">写作</button>
          <button type="button" data-mode="split" class="is-active">分栏</button>
          <button type="button" data-mode="preview">预览</button>
        </div>
      </div>
      <div class="editor-area" id="editorArea" data-mode="split">
        <textarea class="md-input" id="editor" spellcheck="false" placeholder="## 从这里开始写&#10;&#10;正文不要写一级标题，文章标题在左边填。&#10;&#10;- 支持列表、表格、代码块、任务清单&#10;- 不认识的语法保持原样最安全"></textarea>
        <div class="md-preview post-body" id="preview"></div>
      </div>
      <div class="editor-stats">
        <span>字数 <span class="v" id="statWords">0</span></span>
        <span>阅读 <span class="v" id="statTime">1</span> 分钟</span>
        <span>标题 <span class="v" id="statHeads">0</span></span>
        <span id="statWarn"></span>
        <span style="margin-left:auto" id="statSaved"></span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 14px;border-top:1px solid var(--line-soft)">
        <button class="btn primary" type="button" id="btnSave">写入 content/posts/</button>
        <button class="btn" type="button" id="btnExport">导出 .md</button>
        <button class="btn" type="button" id="btnCopy">复制全文</button>
        <button class="btn ghost" type="button" id="btnNew">新建</button>
      </div>
    </section>
  </div>`;

/* ---------------- 元素与状态 ---------------- */

const el = (id) => document.getElementById(id);
const fields = {
  title: el("fTitle"), slug: el("fSlug"), date: el("fDate"), updated: el("fUpdated"),
  category: el("fCategory"), excerpt: el("fExcerpt"), draft: el("fDraft"),
};
const editor = el("editor");
const today = () => new Date().toISOString().slice(0, 10);

fields.date.value = today();
editor.focus();

/* ---------------- 标签 chips ---------------- */

function renderChips() {
  const box = el("chipsBox");
  box.querySelectorAll(".chip").forEach((c) => c.remove());
  const input = el("fTagInput");
  state.tags.forEach((tag, i) => {
    const chip = document.createElement("span");
    chip.className = "chip removable";
    chip.innerHTML = `${escapeHtml(tag)}<button type="button" aria-label="移除 ${escapeHtml(tag)}">×</button>`;
    chip.querySelector("button").addEventListener("click", () => { state.tags.splice(i, 1); renderChips(); });
    box.insertBefore(chip, input);
  });
}

el("fTagInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "," || e.key === "，") {
    e.preventDefault();
    addTags(e.target.value);
    e.target.value = "";
    renderChips();
  } else if (e.key === "Backspace" && !e.target.value && state.tags.length) {
    state.tags.pop();
    renderChips();
  }
});

function addTags(raw) {
  for (const t of String(raw).split(/[,，\s]+/)) {
    const v = t.trim().replace(/^#/, "");
    if (v && !state.tags.includes(v)) state.tags.push(v);
  }
}

/* ---------------- 正文工具栏 ---------------- */

function surround(before, after = before, placeholder = "文字") {
  const { selectionStart: s, selectionEnd: e, value } = editor;
  const picked = value.slice(s, e) || placeholder;
  editor.setRangeText(`${before}${picked}${after}`, s, e, "select");
  editor.focus();
  editor.setSelectionRange(s + before.length, s + before.length + picked.length);
  sync();
}

function eachLine(transform) {
  const { selectionStart: s, selectionEnd: e, value } = editor;
  const from = value.lastIndexOf("\n", s - 1) + 1;
  const to = value.indexOf("\n", e) === -1 ? value.length : value.indexOf("\n", e);
  const block = value.slice(from, to).split("\n").map(transform).join("\n");
  editor.setRangeText(block, from, to, "end");
  editor.focus();
  sync();
}

const ACTIONS = {
  bold: () => surround("**"),
  italic: () => surround("*"),
  strike: () => surround("~~"),
  code: () => surround("`", "`", "code"),
  h2: () => eachLine((l) => (l.startsWith("## ") ? l.slice(3) : `## ${l.replace(/^#{1,6}\s*/, "")}`)),
  h3: () => eachLine((l) => (l.startsWith("### ") ? l.slice(4) : `### ${l.replace(/^#{1,6}\s*/, "")}`)),
  quote: () => eachLine((l) => (l.startsWith("> ") ? l.slice(2) : `> ${l}`)),
  ul: () => eachLine((l) => (l.startsWith("- ") ? l.slice(2) : `- ${l}`)),
  ol: () => eachLine((l, idx) => `${idx + 1}. ${l.replace(/^(\d+[.)]\s|-\s?\[[ x]\]\s?|-\s?)?/, "").replace(/^-\s/, "")}`),
  task: () => eachLine((l) => (l.startsWith("- [ ] ") ? l.slice(6) : `- [ ] ${l.replace(/^-\s/, "")}`)),
  hr: () => insertAt("\n\n---\n\n"),
  link: () => surround("[", "](https://)", "链接文字"),
  image: () => insertAt(`![说明](assets/img/placeholders/cover-a.svg)`),
  table: () => insertAt("\n| 名称 | 说明 | 数量 |\n| :--- | :--- | ---: |\n| 第一项 | 描述 | 1 |\n| 第二项 | 描述 | 2 |\n"),
  fence: () => insertAt("\n```bash\n命令\n```\n"),
};

function insertAt(text) {
  const s = editor.selectionStart;
  editor.setRangeText(text, s, editor.selectionEnd, "end");
  editor.focus();
  sync();
}

for (const btn of main.querySelectorAll(".toolbar [data-act]")) {
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => ACTIONS[btn.dataset.act]?.());
}

for (const btn of main.querySelectorAll(".editor-modes [data-mode]")) {
  btn.addEventListener("click", () => {
    el("editorArea").dataset.mode = btn.dataset.mode;
    main.querySelectorAll(".editor-modes [data-mode]").forEach((b) => b.classList.toggle("is-active", b === btn));
    editor.focus();
  });
}

editor.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) {
    if (e.key === "Tab") { e.preventDefault(); insertAt("  "); }
    return;
  }
  const map = { b: "bold", i: "italic", k: "link", s: "save" };
  const act = map[e.key.toLowerCase()];
  if (!act) return;
  e.preventDefault();
  if (act === "save") exportFile();
  else ACTIONS[act]();
});

/* ---------------- 校验、预览、统计 ---------------- */

function currentSlug() {
  const manual = fields.slug.value.trim();
  if (manual) return manual;
  const fromTitle = slugify(fields.title.value.trim());
  return fromTitle || `draft-${today()}`;
}

function validate() {
  const errors = [];
  if (!fields.title.value.trim()) errors.push("标题不能为空");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date.value.trim())) errors.push("日期需为 YYYY-MM-DD");
  if (fields.updated.value.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(fields.updated.value.trim())) errors.push("更新日期需为 YYYY-MM-DD");
  const slug = currentSlug();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(slug)) errors.push(`标识不合法：${slug}`);
  if (!editor.value.trim()) errors.push("正文还是空的");
  return errors;
}

function buildFile() {
  const fm = [
    "---",
    `title: ${fields.title.value.trim()}`,
    `date: ${fields.date.value.trim()}`,
    fields.updated.value.trim() ? `updated: ${fields.updated.value.trim()}` : "",
    `category: ${fields.category.value.trim() || "未分类"}`,
    `tags: [${state.tags.join(", ")}]`,
    `draft: ${fields.draft.checked}`,
    fields.excerpt.value.trim() ? `excerpt: ${fields.excerpt.value.trim().replace(/\s+/g, " ")}` : "",
    "---",
    "",
  ].filter(Boolean).join("\n");
  return `${fm}${editor.value.replace(/\s+$/, "")}\n`;
}

const WARN_PATTERNS = [
  [/<(?!!--)[a-zA-Z!/][\s\S]*?>/, "正文里出现了 HTML 标签，本站解析器不会渲染它"],
  [/\$\$[\s\S]*?\$\$/, "不支持 LaTeX 公式"],
  [/\[\^[^\]]+\]/, "不支持脚注"],
];

let saveTimer;

function sync() {
  const body = editor.value;
  const { html, toc } = renderMarkdown(body);
  el("preview").innerHTML = html || `<p style="color:var(--text-faint)">还没有正文。</p>`;
  const words = countWords(body);
  el("statWords").textContent = words;
  el("statTime").textContent = readingMinutes(words);
  el("statHeads").textContent = toc.length;
  const warn = WARN_PATTERNS.find(([re]) => re.test(body));
  el("statWarn").innerHTML = warn ? `<span style="color:var(--accent)">⚠ ${warn[1]}</span>` : "";
  el("btnSave").disabled = !state.dir;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 800);
}

for (const node of [editor, fields.title, fields.slug, fields.date, fields.updated, fields.category, fields.excerpt]) {
  node.addEventListener("input", sync);
  node.addEventListener("change", sync);
}
fields.draft.addEventListener("change", sync);
fields.slug.addEventListener("input", () => {
  if (fields.slug.value) fields.slug.value = fields.slug.value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
});

/* ---------------- 草稿（localStorage） ---------------- */

function readDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}

function saveDraft() {
  if (!editor.value && !fields.title.value) return;
  const drafts = readDrafts();
  const key = currentSlug();
  drafts[key] = {
    title: fields.title.value, date: fields.date.value, updated: fields.updated.value,
    category: fields.category.value, tags: state.tags, excerpt: fields.excerpt.value,
    draft: fields.draft.checked, body: editor.value, savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  renderDraftPicker();
  el("statSaved").textContent = `草稿已自动保存 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

function renderDraftPicker() {
  const drafts = readDrafts();
  const keys = Object.keys(drafts).sort((a, b) => (drafts[b].savedAt > drafts[a].savedAt ? 1 : -1));
  el("draftPicker").innerHTML = keys.length
    ? keys.map((k) => `<li><button type="button" data-draft="${escapeHtml(k)}">
        <span class="pt">${escapeHtml(drafts[k].title || k)}</span>
        <span class="pm">草稿 · ${escapeHtml(drafts[k].savedAt.slice(0, 16).replace("T", " "))}</span></button></li>`).join("")
    : `<li style="padding:9px 4px;color:var(--text-faint);font-size:.84rem">暂无本地草稿</li>`;
}

el("draftPicker").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-draft]");
  if (!btn) return;
  const d = readDrafts()[btn.dataset.draft];
  if (!d) return;
  fill({ ...d, slug: btn.dataset.draft });
  toast(`已载入草稿「${d.title || btn.dataset.draft}」`);
});

function fill(data) {
  fields.title.value = data.title || "";
  fields.slug.value = data.slug || "";
  fields.date.value = data.date || today();
  fields.updated.value = data.updated || "";
  fields.category.value = data.category || "";
  fields.excerpt.value = data.excerpt || "";
  fields.draft.checked = Boolean(data.draft);
  state.tags = data.tags || [];
  editor.value = data.body || "";
  renderChips();
  sync();
}

/* ---------------- 已有文章 / 目录 ---------------- */

async function loadKnown() {
  state.known = await loadRawIndex();
  const cats = [...new Set(state.known.map((p) => p.category).filter(Boolean))];
  el("catList").innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">`).join("");
  el("postPicker").innerHTML = state.known.slice(0, 40).map((p) => `<li><button type="button" data-open="${escapeHtml(p.slug)}">
      <span class="pt">${escapeHtml(p.title)}</span>
      <span class="pm">${escapeHtml(p.date)} · ${escapeHtml(p.category)}${p.draft ? " · 草稿" : ""}</span></button></li>`).join("");
}

el("postPicker").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-open]");
  if (!btn) return;
  const slug = btn.dataset.open;
  try {
    const text = state.dir ? await readFromDir(slug) : await loadMarkdown(slug);
    const { meta, body } = parseFrontmatter(text);
    fill({ ...meta, tags: meta.tags || [], slug, body });
    toast(`已载入 ${slug}.md`);
  } catch (err) {
    toast(`载入失败：${err.message}`);
  }
});

/* File System Access API：把编辑器和真实仓库目录打通 */
const dirSupported = "showDirectoryPicker" in window;

el("btnPickDir").addEventListener("click", async () => {
  if (!dirSupported) { toast("当前浏览器不支持直接写文件，请用导出功能"); return; }
  try {
    const handle = await window.showDirectoryPicker({ id: "blog-dir", mode: "readwrite" });
    const probe = await handle.getDirectoryHandle("content").then((d) => d.getDirectoryHandle("posts"));
    state.dir = handle;
    el("dirStatus").innerHTML = `已连接 <b>${escapeHtml(handle.name)}</b>，保存会直接写入 content/posts/。写完仍需在仓库运行 <code>node tools/build.mjs</code> 更新索引。`;
    el("btnUnload").hidden = false;
    void probe;
    sync();
    toast("目录已连接");
  } catch (err) {
    if (err.name !== "AbortError") toast(`连接失败：${err.message}`);
  }
});

el("btnUnload").addEventListener("click", () => {
  state.dir = null;
  el("btnUnload").hidden = true;
  el("dirStatus").textContent = "已断开目录连接。";
  sync();
});

async function readFromDir(slug) {
  const posts = await (await state.dir.getDirectoryHandle("content")).getDirectoryHandle("posts");
  const file = await posts.getFileHandle(`${slug}.md`);
  return (await file.getFile()).text();
}

async function writeToDir(name, text) {
  const posts = await (await state.dir.getDirectoryHandle("content")).getDirectoryHandle("posts");
  const handle = await posts.getFileHandle(`${name}.md`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/* ---------------- 导出 / 保存 ---------------- */

function exportFile() {
  const errors = validate();
  if (errors.length) { toast(errors[0]); return; }
  const name = currentSlug();
  const text = buildFile();
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`已导出 ${name}.md，放入 content/posts/ 后运行 node tools/build.mjs`);
}

async function saveToPosts() {
  const errors = validate();
  if (errors.length) { toast(errors[0]); return; }
  if (!state.dir) { toast("尚未连接博客目录"); return; }
  const name = currentSlug();
  const exists = state.known.some((p) => p.slug === name);
  try {
    await writeToDir(name, buildFile());
    toast(`已写入 content/posts/${name}.md${exists ? "（覆盖原文件）" : ""}。别忘了运行 node tools/build.mjs 重建索引`);
    fields.slug.value = name;
  } catch (err) {
    toast(`写入失败：${err.message}`);
  }
}

el("btnExport").addEventListener("click", exportFile);
el("btnSave").addEventListener("click", saveToPosts);
el("btnCopy").addEventListener("click", async () => {
  const errors = validate();
  if (errors.length) { toast(errors[0]); return; }
  toast((await copyText(buildFile())) ? "完整 Markdown 已复制到剪贴板" : "复制失败");
});
el("btnNew").addEventListener("click", () => {
  fill({ title: "", slug: "", date: today(), category: fields.category.value, tags: [], body: "", excerpt: "", draft: false });
  editor.value = "";
  sync();
  toast("已清空，开始新文章");
});

/* ---------------- 启动 ---------------- */

mountShell();
el("btnUnload").hidden = true;
renderChips();
renderDraftPicker();
sync();
loadKnown().catch(() => {
  el("postPicker").innerHTML = `<li style="padding:9px 4px;color:var(--text-faint);font-size:.84rem">索引未生成，先运行 node tools/build.mjs</li>`;
});
