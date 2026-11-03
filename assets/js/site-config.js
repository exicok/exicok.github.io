// 站点配置：改这一个文件即可，无需构建工具。
// 除 name/author 等文案外，comments（Giscus 评论）与 analytics（访问统计）默认关闭，
// 填好对应字段后自动生效，未填写时页面不会发出任何第三方请求。

export const SITE = {
  // ---------- 基本信息 ----------
  name: "Exicok",
  tagline: "Exicok 的博客",
  description: "记录 Android、Rust、命令行与日常生活。一个零构建的纯静态博客。",
  author: "Exicok",
  // 站点根地址，用于 RSS、sitemap 与 Open Graph（GitHub Pages 用户站即用户名.github.io）
  url: "https://exicok.github.io",
  // 头像：留空则用站点名首字母生成的方块
  avatar: "",

  // ---------- 导航 ----------
  nav: [
    { label: "文章", href: "index.html" },
    { label: "归档", href: "archive.html" },
    { label: "分类", href: "term.html?type=category" },
    { label: "标签", href: "term.html?type=tag" },
    { label: "关于", href: "about.html" },
    { label: "写文章", href: "write.html" },
  ],

  // ---------- 社交与外链（关于页展示，页脚同步） ----------
  social: [
    { label: "GitHub", href: "https://github.com/exicok", note: "github.com/exicok" },
    { label: "RSS 订阅", href: "feed.xml", note: "feed.xml" },
  ],

  // ---------- 阅读与列表 ----------
  postsPerPage: 8,        // 首页每页文章数
  searchSnippetLength: 88, // 搜索结果摘要长度
  // 主题：auto 跟随系统，也可强制 light / dark；用户手动切换后以本地记录为准
  defaultTheme: "auto",

  // ---------- 文章页 ----------
  post: {
    showToc: true,
    tocLevels: [2, 3, 4], // 参与目录的标题层级
    showProgress: true,
    showWordCount: true,
    prevNext: true,
    showUpdated: true,
    copyLink: true,
  },

  // ---------- 评论（Giscus，需要先用 Giscus App 把仓库讨论区启用并到官网取回 id） ----------
  comments: {
    enabled: false,
    repo: "exicok/exicok.github.io", // 存放讨论的公开仓库，不能为私有仓库
    repoId: "",                       // R_kgDO...
    category: "Announcements",        // 讨论分类名
    categoryId: "",                   // DIC_kw...
    mapping: "pathname",              // pathname | url | title | og:title | repo
    lang: "zh-CN",
    lightTheme: "light",
    darkTheme: "transparent_dark",
  },

  // ---------- 访问统计（三选一，全部默认关闭） ----------
  analytics: {
    // none: 完全不加载第三方脚本
    // abacus: 免费计次服务，可显示每篇文章浏览量，无需注册，格式为 user/collection/key
    // gtag: Google Analytics 4    umami: 自托管 Umami
    provider: "none",
    abacus: { user: "exicok", collection: "exicok-github-io" },
    gtag: { measurementId: "" },
    umami: { scriptUrl: "", websiteId: "" },
    showPostViews: true,
  },

  // ---------- 页脚 ----------
  footer: {
    // 版权年份留空则自动取当前年份
    since: 2026,
    note: "本站为纯静态站点，无框架、无数据库，文章以 Markdown 存放于仓库中。",
    links: [
      { label: "RSS", href: "feed.xml" },
      { label: "站点源码", href: "https://github.com/exicok/exicok.github.io" },
    ],
  },
};
