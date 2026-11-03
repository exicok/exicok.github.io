---
title: 2026 年的终端工作流：我最终留下的几个工具
date: 2026-08-05
category: 技术
tags: [CLI, 效率, 工具]
draft: false
excerpt: 几年折腾之后终端里只剩十来件工具，逐个交代留下的理由，并附上仍在生效的别名与配置片段
---

## 删工具的原则

只保留改变了操作本身的工具，纯改变观感的（配色、提示符装饰）能留也不优先。检验方法很粗暴：一个工具如果半夜坏了会打断我的节奏，它才算是工作流的一部分，否则只是贴纸。

## 搜索与浏览这条线上活下来的

- `rg` 完全替代 grep，默认开了 smart case，速度和忽略规则都够好
- `fd` 替代 find，默认尊重 gitignore，并行查找
- `fzf` 挂在 fd 后面做模糊筛选，从此没再敲过完整路径
- `bat` 接管了 pager 位置，翻文件时自带语法高亮和行号
- `zoxide` 替代 cd，按访问频率模糊跳转
- `delta` 负责 git diff 和 blame，逐行对比终于能看了
- `starship` 管理提示符，安静地显示分支与语言版本
- `tmux` 只保一个会话，挂远程机器和长任务
- 编辑器 Neovim，终端本体 WezTerm，配置好多年没大动

把它们串起来的别名就几行，放在 shell 初始化文件末尾：

```bash
command -v rg >/dev/null && alias grep='rg --smart-case'
command -v fd >/dev/null && alias find='fd'
export FZF_DEFAULT_COMMAND='fd -H -t f'
alias pick='fzf --preview "bat --color=always {}"'
alias g='grep'
```

## 配置文件里剩下的部分

git 的全局配置多年只增不删，最后精简成这样一份：

```toml
[core]
pager = delta
[interactive]
diffFilter = delta --color-only
[delta]
navigate = true
side-by-side = false
[alias]
st = status -sb
lg = log --oneline --graph
```

## 被我退回的几样

Warp 用过两个月，输入编辑器这个概念确实好，但它要绑厂商账号，工作机上不去，最终只能放弃。几个带预览的全能文件管理器也退了，原因是和 fd 加 fzf 的组合功能重叠，两套记忆负担反而更大。starship 之前用过手写的 PS1 拼接，可读性太差，这也是我后来接受现成提示符工具的原因。

## 一点提醒

工作流是长出来的，不是抄出来的。上面每件工具各自解决过一个我真实存在的烦躁，所以留得住。如果要捡新工具，起点应该是过去一周里让你骂出声的那一步，而不是任何榜单。
