#!/usr/bin/env node
/**
 * 课刻 ClassTick · 单文件构建（皇室典藏 · 皇家导师版）
 * 把 CSS / JS / 图标 / 皇室素材 / 导师立绘全部内联成一个 .html，方便：
 *   · 发到手机上用浏览器直接打开（离线可用）
 *   · 丢进任何静态托管（Netlify Drop / GitHub Pages）直接可用
 *
 * 用法：node tools/build_single.mjs
 * 产物：dist/课刻-手机版.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
mkdirSync(DIST, { recursive: true });

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readBinary = (p) => readFileSync(join(ROOT, p));
const OPT = join(ROOT, 'assets', 'opt');
const assetFile = (rel) => {
  const opt = join(OPT, rel.replace(/^assets\//, ''));
  return existsSync(opt) ? opt : join(ROOT, rel);
};
const inline = (value) => () => value;

let html = read('index.html');

// 1) 内联三张样式表（基础 + 皇室皮肤 + 皇家导师）
const styles = [
  ['assets/style.css', /<link rel="stylesheet" href="assets\/style\.css">/],
  ['assets/royal.css', /<link rel="stylesheet" href="assets\/royal\.css">/],
  ['assets/teacher.css', /<link rel="stylesheet" href="assets\/teacher\.css">/],
  ['assets/royal-polish.css', /<link rel="stylesheet" href="assets\/royal-polish\.css">/],
  ['assets/planner.css', /<link rel="stylesheet" href="assets\/planner\.css">/],
  ['assets/court.css', /<link rel="stylesheet" href="assets\/court\.css">/]
];
for (const [file, pattern] of styles) {
  if (!pattern.test(html)) throw new Error('index.html 里找不到样式引用：' + file);
  html = html.replace(pattern, inline('\n  <style>\n' + read(file) + '\n  </style>'));
}

// 2) 皇室素材 → data URI（离线单文件也能看到城堡/羊皮纸/金线/蜡封）
const ROYAL_ASSETS = [
  'hero-castle.webp', 'parchment.webp',
  'corner-tl.webp', 'corner-tr.webp', 'corner-bl.webp', 'corner-br.webp',
  'crown.webp', 'seal.webp', 'rose-window.webp', 'divider.webp',
  'castle-crest.webp', 'castle-badge.webp', 'knight.webp', 'king.webp', 'queen.webp',
  'court-thumb-knight.webp', 'court-thumb-king.webp', 'court-thumb-queen.webp',
  'court-face-knight.webp', 'court-face-king.webp', 'court-face-queen.webp'
];
const royalData = {};
for (const name of ROYAL_ASSETS) {
  const file = assetFile('assets/royal/' + name);
  if (!existsSync(file)) {
    throw new Error('缺少皇室素材：' + file + '，先运行 python tools/process_royal_assets.py');
  }
  royalData[name] = 'data:image/webp;base64,' + readFileSync(file).toString('base64');
}
html = html.replace(/url\("\.\.\/assets\/royal\/([a-z0-9-]+\.webp)"\)/g, (match, name) => {
  if (!royalData[name]) throw new Error('CSS 里引用了未知皇室素材：' + name);
  return 'url("' + royalData[name] + '")';
});
html = html.replace(/(?:\.\.\/)?assets\/royal\/([a-z0-9-]+\.webp)/g, (match, name) => {
  if (!royalData[name]) throw new Error('HTML/JS 引用了未知皇室素材：' + name);
  return royalData[name];
});

// 3) 皇家导师素材 → data URI
const TEACHER_ASSETS = ['full.webp', 'bust.webp', 'avatar.webp', 'thinking.webp', 'chibi.webp', 'full-star.webp', 'full-rose.webp', 'full-witch.webp', 'full-blink.webp', 'full-talk.webp', 'full-smile.webp'];
const teacherData = {};
for (const name of TEACHER_ASSETS) {
  const file = assetFile('assets/teacher/' + name);
  if (!existsSync(file)) {
    throw new Error('缺少导师素材：' + file + '，先运行 python tools/process_teacher_assets.py');
  }
  teacherData[name] = 'data:image/webp;base64,' + readFileSync(file).toString('base64');
}
html = html.replace(/(?:\.\.\/)?assets\/teacher\/([a-z-]+\.webp)/g, (match, name) => {
  if (!teacherData[name]) throw new Error('引用了未知导师素材：' + name);
  return teacherData[name];
});

// 4) 图标与 favicon 内联
const iconPngUri = 'data:image/png;base64,' + readFileSync(assetFile('icons/icon-96.png')).toString('base64');
const badgeUri = 'data:image/png;base64,' + readBinary('icons/badge-96.png').toString('base64');
html = html.replace(/\s*<link rel="preload"[^>]*hero-castle[^>]*>/, '');
html = html.replace(/\s*<link rel="icon"[^>]*>/g, '');
html = html.replace('<meta name="theme-color"', inline('<link rel="icon" type="image/png" href="' + iconPngUri + '">' + String.fromCharCode(10) + '  <meta name="theme-color"'));
html = html.replace('src="icons/icon-192.png"', inline('src="' + iconPngUri + '"'));
html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '');
html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
html = html.replace(/\s*<meta name="apple-mobile-web-app-capable"[^>]*>/, '');
html = html.replace(/\s*<meta name="apple-mobile-web-app-title"[^>]*>/, '');
html = html.replace(/\s*<meta name="apple-mobile-web-app-status-bar-style"[^>]*>/, '');

// 4b) 单文件：剥离首屏立绘 src，改用内联映射（避免同一个 data URI 重复两次）
html = html.replace('src="assets/teacher/full.webp"', 'src=""');
html = html.replace('src="assets/teacher/full-witch.webp"', 'src=""');
const outfitMap = {
  'full.webp': teacherData['full.webp'],
  'full-star.webp': teacherData['full-star.webp'],
  'full-rose.webp': teacherData['full-rose.webp'],
  'full-witch.webp': teacherData['full-witch.webp'],
  'full-blink.webp': teacherData['full-blink.webp'],
  'full-talk.webp': teacherData['full-talk.webp'],
  'full-smile.webp': teacherData['full-smile.webp']
};
html = html.replace('<script src="assets/app.js"></script>', inline(
  '<script>window.__CLASSTICK_OUTFIT_SRC=' + JSON.stringify(outfitMap) + '</script><script src="assets/app.js"></script>'
));

// 5) 内联脚本（file:// 下没有 Service Worker，注册逻辑在 app.js 里已按协议跳过）
const scripts = [
  ['<script src="assets/seed.js"></script>', read('assets/seed.js')],
  ['<script src="assets/core.js"></script>', read('assets/core.js')],
  ['<script src="assets/app.js"></script>', read('assets/app.js')]
];
for (const [tag, code] of scripts) {
  if (!html.includes(tag)) throw new Error('找不到脚本标签：' + tag);
  html = html.replace(tag, inline('<script>\n' + code + '\n  </script>'));
}

// 5b) 脚本内联后再替换一次导师素材路径（app.js 里仍有 assets/teacher/*.webp 引用）
html = html.replace(/(?:\.\.\/)?assets\/teacher\/([a-z-]+\.webp)/g, (match, name) => {
  if (!teacherData[name]) throw new Error('引用了未知导师素材：' + name);
  return teacherData[name];
});

// 6) 通知图标也内联，避免 file:// 下路径失效
html = html.replace(/'icons\/icon-192\.png'/g, inline("'" + iconPngUri + "'"));
html = html.replace(/'icons\/badge-96\.png'/g, inline("'" + badgeUri + "'"));

// 7) 单文件版隐藏「安装」按钮（没有 HTTPS 安装不了）
html = html.replace('<body>', '<body data-build="single-file">');
html = html.replace('</head>', inline('  <style>\n    body[data-build="single-file"] #btn-install { display: none; }\n    body[data-build="single-file"] .foot { padding-bottom: 12px; }\n  </style>\n</head>'));

// 8) 标题里加一句说明
html = html.replace('<title>课刻 ClassTick · 皇家课程表</title>', '<title>课刻 ClassTick · 皇家课程表（单文件版）</title>');

const out = join(DIST, '课刻-手机版.html');
writeFileSync(out, html, 'utf8');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('已生成 ' + out + '（' + kb + ' KB）');

// 顺手输出一份示例 .ics，方便直接体验「导入系统日历」
const require = createRequire(import.meta.url);
const C = require(join(ROOT, 'assets/core.js'));
const seed = require(join(ROOT, 'assets/seed.js')).ClassTickSeed || {};
const data = C.normalizeData(seed);
const ics = C.buildICS(data, { now: new Date() });
const icsPath = join(DIST, '课刻课表_示例.ics');
writeFileSync(icsPath, ics.text, 'utf8');
console.log('已生成 ' + icsPath + '（' + ics.events + ' 个日历事件）');
console.log('dist 目录：' + DIST);
