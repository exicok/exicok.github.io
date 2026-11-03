# Exicok 的博客

托管在 GitHub Pages 上的纯静态博客：没有框架、没有 npm 依赖、没有构建产物以外的负担。
文章是仓库里的 Markdown 文件，页面在浏览器里用 `assets/js/md.js` 这个自带的小解析器渲染。

站点地址：https://exicok.github.io

## 目录结构

```
index.html          首页：文章列表 + 分类/标签筛选 + 分页
post.html           文章页（post.html?id=文章标识）
archive.html        按年月的归档
term.html           分类与标签（?type=category / ?type=tag，可带 &value=）
search.html         搜索页；任意页面按 Ctrl+K 也能呼出搜索面板
about.html          关于
write.html          写文工具：填分类标签、实时预览、导出或直接写入仓库目录
404.html            Pages 的 404 页
assets/css/main.css 全站样式与亮/暗主题变量
assets/js/
  site-config.js    站点配置（标题、简介、导航、评论、统计开关）
  md.js             Markdown 解析器（浏览器与构建脚本共用）
  app.js            外壳、主题、数据加载、搜索引擎、Giscus、访问统计
  main.js           各页面渲染与路由分发
  write.js          写文工具
assets/img/         favicon 与占位图
content/posts/      文章源文件，文件名即文章标识
data/               生成的索引（posts.json、search.json）
feed.xml            RSS 2.0，含全文
sitemap.xml         站点地图
tools/build.mjs     索引生成器
tools/serve.mjs     本地预览服务器
.github/workflows/  content/ 变化时自动重建索引并提交
```

## 本地预览

```bash
node tools/serve.mjs 8080      # 然后打开 http://localhost:8080/
```

必须用服务器打开：ES Module 与 `fetch` 在 `file://` 下会被浏览器拦掉。需要 Node 18 以上。

## 写一篇新文章

推荐用自带工具：打开 [write.html](https://exicok.github.io/write.html)（本地预览时用 `http://localhost:8080/write.html`）。
左侧填标题、分类、标签与摘要，右侧写正文，预览与线上渲染完全一致；
点「选择博客目录」后可把 `.md` 直接写进 `content/posts/`，也可以「导出 .md」自行放置。
内容只存在浏览器里，草稿自动保存在本地。

手写也可以，在 `content/posts/` 新建 `my-post.md`：

```markdown
---
title: 文章标题
date: 2026-11-03
updated: 2026-11-05
category: 技术
tags: [Rust, 笔记]
draft: false
excerpt: 一句话摘要，显示在列表页
---

## 小节标题

正文从这里开始。
```

然后重建索引并提交：

```bash
node tools/build.mjs
git add content data feed.xml sitemap.xml && git commit && git push
```

`build.mjs` 的几个开关：`--drafts` 本地预览草稿，`--check` 只检查索引是否过期（CI 用）。
忘了跑也没关系，`.github/workflows/rebuild-index.yml` 会在 `content/` 变化时补一次构建并提交结果。

## 支持的 Markdown 语法

见站内文章 [本站 Markdown 语法速查](post.html?id=markdown-syntax-tour)。
刻意收窄的子集包括：`#` 到 `######` 标题、段落、`**加粗**`、`*斜体*`、`~~删除线~~`、行内代码、
带语言名的围栏代码块（复制按钮 + 语法高亮）、引用块、有序/无序/嵌套列表、任务列表、
对齐表格、分割线、链接与图片、反斜杠转义。不支持原始 HTML、LaTeX、脚注——写文工具会给出提示。
`javascript:` 等危险链接会被改写，正文里的 HTML 一律转义后再渲染。

## 部署到 GitHub Pages

仓库名为 `exicok.github.io` 时，进入 Settings → Pages，Source 选 **Deploy from a branch**，
分支 `main`、目录 `/ (root)`，保存即可。仓库里已放 `.nojekyll`，Pages 不会做 Jekyll 处理。

换自定义域名的话，加一个 `CNAME` 文件，并把 `assets/js/site-config.js` 里的 `url` 改成新域名
（RSS、sitemap、Open Graph 都取这个值）。

## 评论与访问统计

两项都默认关闭，不启用时页面不会发出任何第三方请求。

- **Giscus 评论**：先给仓库开启 Discussions 并安装 Giscus App，再到 giscus.app 取回
  `repoId` 与 `categoryId`，填进 `site-config.js` 的 `comments`，并把 `enabled` 设为 `true`。
- **访问统计**：`analytics.provider` 可选 `none` / `abacus` / `gtag` / `umami`。
  `abacus` 免费无需注册，会在文章页显示每篇浏览量，需填 `abacus.user` 与 `collection`；
  `gtag` 填 GA4 的 Measurement ID；`umami` 填自托管脚本地址与站点 ID。

## 常见问题

- **新文章没出现**：没跑 `node tools/build.mjs`，或生成的 `data/` 没提交。
- **某篇语法没渲染出来**：只支持上面列出的子集，速查文里有对照表。
- **深色模式闪一下白**：确认 `<html>` 上的主题预应用脚本没被删掉（每个页面的 `<head>` 里各有一行）。
- **想删掉示例文章**：删 `content/posts/` 下对应文件，重新构建索引即可。
