# Axiom 应用数学社官网

![version](https://img.shields.io/badge/version-A1-blue)
![last commit](https://img.shields.io/github/last-commit/ChromiteCr/axiom.nestudy)
![commit activity](https://img.shields.io/github/commit-activity/m/ChromiteCr/axiom.nestudy)
![stars](https://img.shields.io/github/stars/ChromiteCr/axiom.nestudy)

Axiom 应用数学社的宣传网站。单页，纯静态，中英双语。没有框架，也没有构建步骤，推到 GitHub Pages 就能访问。

## 本地预览

```bash
python3 -m http.server 5199
```

打开 http://localhost:5199 。直接双击 `index.html` 也能看，但浏览器会拦下本地字体文件，公式和字标会退回系统字体。

## 结构

```
index.html              全部内容，中英两份文案并排写在一起
assets/css/site.css     样式
assets/js/attractor.js  首屏：洛伦茨吸引子，按住放下锚点
assets/js/site.js       语言切换、导航、证明逐行点亮、训练营滑轨、线路图
assets/img/             徽标与网站图标
assets/fonts/           KaTeX 的 Computer Modern 字体（许可见 KaTeX-LICENSE.txt）
```

## 改文案

每段文字都有两份：`<span data-l="zh">…</span><span data-l="en">…</span>`。改一种语言，记得另一种也一起改。页面按 `<html data-lang>` 只显示其中一份；访客的选择存在浏览器里，第一次来按浏览器语言决定。

活动时间、人数、奖项都照社团提供的原文写。地点和报名方式原文没有给，页面上写的是「以社团通知为准」，有了确定信息再补。

## 徽标

一个角。两条射线从同一个顶点出发，中间一段角弧，合起来是字母 A。顶点上的紫点就是公理，一切从这里出发。

- `assets/img/axiom-mark.svg`：图形标志
- `assets/img/axiom-logo.svg`：图形加字标，字标是 Computer Modern 的字形轮廓，不依赖字体安装
- `assets/img/favicon.svg`、`assets/img/apple-touch-icon.png`：网站图标

## 数据与署名

地铁线路图取自 OpenStreetMap（© OpenStreetMap contributors，ODbL 许可），页面底部已署名。

## 版本记录

| 版本 | 日期 | 变更内容 | 类型 |
|------|------|----------|------|
| A1 | 2026-09-22 | 官网第一版。整站按一篇数学文本来排：首屏是洛伦茨吸引子，粒子从几乎同一点出发，几秒后散成混沌；按住画面放下锚点，粒子按黄金角螺旋收拢，松手回到混沌，混合量由临界阻尼弹簧驱动，随时可以打断。之后依次是定义与两栏证明（滚到哪行亮哪行）、四条公理、午间活动、23 周训练营（横向滑轨）、我们出的题「地铁成绩单」（可交互的北京线路图）和加入，以 ∎ 收尾。中英文一键切换，不刷新页面。徽标是一个角：顶点、两条射线、一段角弧。字体用系统字和 KaTeX 的 Computer Modern，零依赖。照顾减弱动效、减弱透明度和高对比度三种系统偏好 | milestone |
