---
title: Rust 所有权与借用：一遍读不懂的三句话
date: 2026-09-14
updated: 2026-09-20
category: 技术
tags: [Rust, 笔记]
draft: false
excerpt: 把所有权三条规则翻译成更接近直觉的三句话，附一段能编译的例子和一段被编译器拒绝的例子
---

## 三条规则，说人话的版本

书上的规则原文写得非常克制，我第一遍读完完全没感觉。后来发现问题不在理解力，在于术语密度，把它换成大白话就顺了。

1. 每个值同一时刻只有一个变量对它负责，这个变量叫所有者。
2. 赋值和传参是移交责任，不是复制。移交之后原变量作废。
3. 所有者离开作用域，值被清理，自动进行，且只发生一次。

> 真正让我开窍的是论坛上的一句话：借用检查器不是在判断你的程序对不对，它是在判断你是否清楚每一个值会在哪一行被销毁。

## 一个能通过的例子

```rust
fn own_and_measure(name: String) -> usize {
    // 参数按值接收，函数结束时 name 在这里被 drop
    name.len()
}

fn main() {
    let city = String::from("成都");
    // String 没有实现 Copy，传参即移动
    let len = own_and_measure(city);
    // println!("{}", city); // 注释去掉会得到 E0382，use of moved value
    assert_eq!(len, 6);
}
```

`city` 交出所有权之后自己就空了，所以最后一行打印是非法的。想「看一眼但不拿走」，参数就该写成 `&str`，调用处写 `&city` 或者 `city.as_str()`。

## 一个被编译器拦下的例子

```rust
fn make_a_label() -> &String {
    let s = String::from("局部变量");
    &s
}

fn main() {
    let label = make_a_label();
    println!("{}", label);
}
```

编译错误原文很长，这里只留关键的两行：

```text
error[E0515]: cannot return value referencing local variable `s`
help: `s` is owned by the current function, it is dropped at the closing brace
```

`s` 在 `make_a_label` 的右花括号处就被销毁了，把它内部的引用递出去等于把钥匙交给一间即将拆掉的房子。这类悬垂引用在别的语言里是运行时事故，在 Rust 里连编译都过不去。修法很简单，直接返回 `s` 本身，让所有权跟着值一起走。

## 容易混淆的点

| 混淆的一对 | 实际区别 | 一句直觉 |
| :--- | :--- | :--- |
| `String` 与 `&str` | 前者拥有内存，后者借用一段切片 | 函数参数尽量写成 `&str` |
| 移动与 `Copy` | 整数等类型复制，堆上类型移动 | 实现了 `Copy` 的类型传出去还能用 |
| `&mut T` 与 `&T` | 可变引用同一时刻只能有一个 | 要么一个写的人，要么若干读的人 |

## 一点体会

被拒绝的写法并不比正确写法难写，难的是提前想到值会在哪一行死掉。这个思维负担在写小脚本时确实烦，但每一次 E0382 和 E0515，换算到别的语言里都是一条随时可能踩中的隐藏 bug。
