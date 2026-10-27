#!/usr/bin/env node
/**
 * 准备 Capacitor 原生壳的 www 目录。
 * 用法：node tools/prepare_native.mjs
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'native', 'www');

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

for (const file of ['index.html', 'manifest.webmanifest', 'sw.js']) {
  cpSync(join(ROOT, file), join(WWW, file));
}

// 只拷运行时素材与代码，跳过 raw / opt / dist / docs 等
cpSync(join(ROOT, 'assets'), join(WWW, 'assets'), {
  recursive: true,
  filter: (src) => !/[\\/](raw|opt)([\\/]|$)/.test(src) && !src.endsWith('.py')
});
cpSync(join(ROOT, 'icons'), join(WWW, 'icons'), { recursive: true });

// 原生壳里隐藏「安装到桌面」按钮；Service Worker 在 WebView 里仍可注册，但后台推送走原生方案更稳
const index = readFileSync(join(WWW, 'index.html'), 'utf8')
  .replace('<body>', '<body data-native="1">')
  .replace('</head>', '  <style>body[data-native="1"] #btn-install{display:none!important}</style>\n</head>');
writeFileSync(join(WWW, 'index.html'), index);

console.log('  [native] www 已准备：' + WWW);
console.log('  [native] 下一步：npm run native:sync && npm run native:android（需要 Android Studio / SDK）');
