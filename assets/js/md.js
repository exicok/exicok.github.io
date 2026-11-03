// 站点自带的小型 Markdown 渲染器：不依赖任何第三方库。
// 浏览器与 tools/build.mjs 共用同一份实现，保证 RSS 内容与页面渲染一致。

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function escapeXml(str) {
  return escapeHtml(str);
}

// 生成标题/文件名可用的 slug，保留中日韩字符。
export function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s~`!@#$%^&*()_+=[\]{}|;:'",.<>/?\\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeUrl(url) {
  const raw = String(url).trim();
  if (/^(javascript|vbscript|file):/i.test(raw) || /^data:/i.test(raw) && !/^data:image\//i.test(raw)) {
    return "#";
  }
  return raw.replace(/"/g, "%22");
}

const LANGS = {
  bash: {
    line: /(?:#[^\n]*)/,
    kw: ["if", "then", "else", "elif", "fi", "for", "in", "do", "done", "while", "case", "esac", "function", "return", "export", "local", "echo", "cd", "set", "source", "exit", "true", "false"],
    fn: false,
  },
  sh: { line: /(?:#[^\n]*)/, kw: ["if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac", "function", "export", "echo"], fn: false },
  js: {
    line: /\/\/[^\n]*/, block: [/\/\*[\s\S]*?\*\//],
    kw: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "new", "class", "extends", "super", "this", "typeof", "instanceof", "await", "async", "yield", "try", "catch", "finally", "throw", "import", "from", "export", "default", "delete", "void", "in", "of", "null", "undefined", "true", "false", "NaN", "Infinity"],
    fn: true,
  },
  ts: {
    line: /\/\/[^\n]*/, block: [/\/\*[\s\S]*?\*\//],
    kw: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "switch", "case", "break", "continue", "new", "class", "extends", "implements", "interface", "type", "enum", "this", "typeof", "keyof", "await", "async", "try", "catch", "finally", "throw", "import", "from", "export", "default", "public", "private", "protected", "readonly", "null", "undefined", "true", "false"],
    fn: true,
  },
  python: {
    line: /#[^\n]*/, block: [/("""[\s\S]*?""")|('''[\s\S]*?''')/],
    kw: ["def", "class", "return", "if", "elif", "else", "for", "while", "break", "continue", "pass", "import", "from", "as", "with", "try", "except", "finally", "raise", "lambda", "yield", "global", "nonlocal", "None", "True", "False", "and", "or", "not", "in", "is", "self", "async", "await"],
    fn: true,
  },
  rust: {
    line: /\/\/[^\n]*/, block: [/\/\*[\s\S]*?\*\//],
    kw: ["fn", "let", "mut", "const", "static", "struct", "enum", "impl", "trait", "type", "pub", "use", "mod", "crate", "self", "super", "match", "if", "else", "loop", "while", "for", "in", "return", "break", "continue", "move", "ref", "as", "dyn", "async", "await", "unsafe", "where", "Some", "None", "Ok", "Err", "true", "false", "String", "Vec", "Option", "Result"],
    fn: true,
  },
  go: {
    line: /\/\/[^\n]*/, block: [/\/\*[\s\S]*?\*\//],
    kw: ["package", "import", "func", "var", "const", "type", "struct", "interface", "map", "chan", "go", "defer", "return", "if", "else", "for", "range", "switch", "case", "default", "break", "continue", "select", "nil", "true", "false", "string", "int", "int64", "float64", "bool", "byte", "error", "make", "new", "append", "len", "cap"],
    fn: true,
  },
  json: { line: null, block: null, kw: ["true", "false", "null"], fn: false, json: true },
  yaml: { line: /#[^\n]*/, block: null, kw: ["true", "false", "null", "yes", "no"], fn: false },
  toml: { line: /#[^\n]*/, block: null, kw: ["true", "false"], fn: false },
  sql: {
    line: /--[^\n]*/, block: [/\/\*[\s\S]*?\*\//],
    kw: ["select", "from", "where", "group", "by", "order", "limit", "offset", "insert", "into", "values", "update", "set", "delete", "join", "left", "right", "inner", "outer", "on", "as", "and", "or", "not", "null", "is", "in", "like", "between", "having", "distinct", "count", "sum", "avg", "max", "min", "case", "when", "then", "end", "create", "table", "primary", "key", "references", "foreign", "index", "desc", "asc"],
    fn: false, ci: true,
  },
  html: { line: null, block: [/<!--[\s\S]*?-->/], kw: [], fn: false, markup: true },
  css: { line: null, block: [/\/\*[\s\S]*?\*\//], kw: [], fn: false },
  text: { line: null, block: null, kw: [], fn: false },
};

const ALIAS = { shell: "bash", zsh: "bash", "c++": "rust", cpp: "rust", jsx: "js", tsx: "ts", py: "python", rs: "rust", golang: "go", yml: "yaml", postgres: "sql", mysql: "sql" };

function highlight(code, lang) {
  const def = LANGS[ALIAS[lang] || lang];
  if (!def || lang === "text") return escapeHtml(code);

  if (def.markup) {
    return escapeHtml(code)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tok-tag">$2</span>')
      .replace(/([a-zA-Z-][\w-]*)=(&quot;|&#39;)/g, '<span class="tok-attr">$1</span>=$2');
  }

  // 五个分类都用命名分组，缺一类时填入不可能出现的字符占位，避免组序号错位。
  const NO = "\\uFFFF\\uFFFF";
  const block = def.block ? def.block.map((r) => r.source).join("|") : NO;
  const line = def.line ? def.line.source : NO;
  const str = '"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`';
  const kw = def.kw.length ? `\\b(?:${def.kw.join("|")})\\b` : NO;
  const fn = def.fn ? "\\b[A-Za-z_$][\\w$]*(?=\\s*\\()" : NO;
  const re = new RegExp(
    `(?<com>(?:${block}|${line}))|(?<str>${str})|(?<num>\\b\\d+(?:\\.\\d+)?\\b)|(?<kw>${kw})|(?<fn>${fn})`,
    def.ci ? "gim" : "gm"
  );

  const classify = (m) => {
    const g = m.groups;
    if (g.com !== undefined) return "tok-com";
    if (g.str !== undefined) {
      // JSON 里冒号前的字符串是键，用属性色区分
      if (def.json && /^\s*:/.test(code.slice(m.index + m[0].length))) return "tok-attr";
      return "tok-str";
    }
    if (g.num !== undefined) return "tok-num";
    if (g.kw !== undefined) return "tok-kw";
    return "tok-fn";
  };

  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    out += `<span class="${classify(m)}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  return out + escapeHtml(code.slice(last));
}

// 行内解析：先把不可再处理的片段（转义字符、行内代码、自动链接、链接首尾标签）存进
// stash，用 \u0001+序号+\u0001 占位，最后一次性还原，这样闭合标签不会丢失。
const PH = "\u0001";

function inline(text) {
  const stash = [];
  const keep = (piece) => `${PH}${stash.push(piece) - 1}${PH}`;

  let s = String(text).replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, (_, ch) => keep(escapeHtml(ch)));
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${escapeHtml(c)}</code>`));
  s = s.replace(/<(https?:\/\/[^\s>]+)>/g, (_, u) => keep(`<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a>`));

  s = escapeHtml(s);

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => keep(`<img src="${safeUrl(src)}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy">`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const ext = /^https?:/i.test(href);
    return keep(`<a href="${safeUrl(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}${title ? ` title="${title}"` : ""}>`) + label + keep("</a>");
  });

  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return s.replace(new RegExp(`${PH}(\\d+)${PH}`, "g"), (_, i) => stash[+i]);
}

const RE_HR = /^ {0,3}(?:([-*_])(?: *\1){2,})$/;
const RE_HEAD = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)\s*$/;
const RE_UL = /^( *)([-*+])\s+(.*)$/;
const RE_OL = /^( *)(\d{1,9})[.)]\s+(.*)$/;
const RE_TASK = /^\[([ xX])\]\s+(.*)$/;
const RE_QUOTE = /^ {0,3}>\s?(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function cells(row) {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function splitRow(line) {
  const out = [];
  let cur = "";
  let inCode = false;
  const row = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode && row[i - 1] !== "\\") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.map((c) => c.replace(/\\\|/g, "|"));
}

// 解析同一缩进层级的列表项，返回 [items, 下一行下标]。
function listItems(lines, start, ordered, baseIndent) {
  const items = [];
  const re = ordered ? RE_OL : RE_UL;
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (!m || m[1].length !== baseIndent) break;
    if (ordered && items.length && Number(m[2]) !== Number(items[items.length - 1].marker) + 1) break;

    const item = { marker: m[2], text: m[3], children: [] };
    i++;
    while (i < lines.length) {
      const cur = lines[i];
      if (!cur.trim()) {
        const after = lines[i + 1] || "";
        const am = after.match(RE_UL) || after.match(RE_OL);
        if ((am && am[1].length > baseIndent) || /^ {2,}\S/.test(after)) { i++; continue; }
        break;
      }
      const um = cur.match(RE_UL);
      const om = cur.match(RE_OL);
      const indent = um ? um[1].length : om ? om[1].length : cur.match(/^(\s*)/)[1].length;
      if (indent > baseIndent && (um || om)) {
        const sub = listItems(lines, i, Boolean(om), indent);
        item.children.push(...sub[0]);
        i = sub[1];
        continue;
      }
      if (indent > baseIndent) { item.text += " " + cur.trim(); i++; continue; }
      break;
    }
    items.push(item);
  }
  return [items, i];
}

function renderList(items, ordered) {
  let html = "";
  for (const item of items) {
    const task = item.text.match(RE_TASK);
    let body;
    let cls = "";
    if (task) {
      cls = ' class="task"';
      body = `<input type="checkbox" disabled${/[xX]/.test(task[1]) ? " checked" : ""}><span class="task-text">${inline(task[2])}</span>`;
    } else body = inline(item.text);
    html += `<li${cls}>${body}${item.children.length ? renderList(item.children, ordered) : ""}</li>`;
  }
  return ordered ? `<ol>${html}</ol>` : `<ul>${html}</ul>`;
}

export function renderMarkdown(source, options = {}) {
  const src = String(source).replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
  const lines = src.split("\n");
  const toc = [];
  const headings = [];
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(RE_FENCE);
    if (fence) {
      const marker = fence[1][0];
      const lang = (fence[2] || "").toLowerCase();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(marker.repeat(3))) buf.push(lines[i++]);
      i++;
      const code = buf.join("\n");
      html += `<div class="codeblock"${lang ? ` data-lang="${escapeHtml(lang)}"` : ""}><pre><code>${highlight(code, lang)}</code></pre></div>`;
      continue;
    }

    const head = line.match(RE_HEAD);
    if (head) {
      const level = head[1].length;
      const text = head[2];
      const base = slugify(text) || `h${toc.length + 1}`;
      let id = base;
      let dup = 2;
      while (headings.includes(id)) id = `${base}-${dup++}`;
      headings.push(id);
      toc.push({ level, id, text });
      html += `<h${level} id="${id}">${inline(text)}<a class="anchor" href="#${id}" aria-label="链接到本节">#</a></h${level}>`;
      i++;
      continue;
    }

    if (RE_HR.test(line)) { html += "<hr>"; i++; continue; }

    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && (RE_QUOTE.test(lines[i]) || (buf.length && lines[i].trim() && !RE_HEAD.test(lines[i])))) {
        buf.push((lines[i].match(RE_QUOTE) || [, lines[i]])[1]);
        i++;
      }
      html += `<blockquote>${renderMarkdown(buf.join("\n")).html}</blockquote>`;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const header = splitRow(line);
      const aligns = cells(lines[i + 1]).map((c) => (/^:.*:$/.test(c) ? "center" : /:$/.test(c) ? "right" : ""));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) rows.push(splitRow(lines[i++]));
      let t = '<div class="table-wrap"><table><thead><tr>';
      header.forEach((c, idx) => { t += `<th${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ""}>${inline(c)}</th>`; });
      t += "</tr></thead><tbody>";
      for (const row of rows) {
        t += "<tr>";
        row.forEach((c, idx) => { t += `<td${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ""}>${inline(c)}</td>`; });
        t += "</tr>";
      }
      html += `${t}</tbody></table></div>`;
      continue;
    }

    const ul = line.match(RE_UL);
    const ol = line.match(RE_OL);
    if (ul || ol) {
      const ordered = Boolean(ol);
      const indent = (ordered ? ol : ul)[1].length;
      const [items, next] = listItems(lines, i, ordered, indent);
      html += renderList(items, ordered);
      i = next;
      continue;
    }

    const buf = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (!cur.trim() || RE_HR.test(cur) || RE_HEAD.test(cur) || RE_FENCE.test(cur) || RE_QUOTE.test(cur) || RE_UL.test(cur) || RE_OL.test(cur)) break;
      buf.push(cur.trim());
      i++;
    }
    html += `<p>${inline(buf.join(" "))}</p>`;
  }

  return { html, toc };
}

// 抽取纯文本，用于搜索索引与摘要。
export function plainText(source) {
  return String(source)
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^ {0,3}#{1,6}\s+/gm, "")
    .replace(/^ {0,3}> ?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/[*_~`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 中文字数 + 英文单词数，用于阅读时长估算。
export function countWords(source) {
  const text = plainText(source);
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ").match(/[A-Za-z0-9'’\-]+/g) || []).length;
  return cjk + latin;
}

export function readingMinutes(words) {
  return Math.max(1, Math.round(words / 380));
}
