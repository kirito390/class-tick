#!/usr/bin/env node
/**
 * 课刻 ClassTick · 零依赖本地服务器
 * 用法：
 *   node server.mjs            # 默认 http://localhost:8788
 *   node server.mjs 9000       # 指定端口
 *   PORT=9000 node server.mjs  # 环境变量也可以
 *
 * 因为走的是 http://localhost，浏览器会把课刻视为「安全上下文」，
 * 于是 Service Worker、系统通知、PWA 安装都能用。
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

// Web Push 后台传令（可选：web-push 未安装时静态服务照常运行）
let pushApi = null;
try {
  pushApi = await import('./push-server.mjs');
  pushApi.start();
} catch (err) {
  console.warn('  [push] 后台传令不可用：' + err.message);
  console.warn('  [push] 运行 npm install 安装 web-push 后重启即可启用');
}
const argPort = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const PORT = Number(process.env.PORT || argPort || 8788);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2'
};

function lanUrls(port) {
  const urls = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const ip = net.address;
      // 跳过 Clash / TUN 之类的虚拟网段
      if (/^198\.(18|19)\./.test(ip)) continue;
      urls.push({ name, ip, url: `http://${ip}:${port}/` });
    }
  }
  return urls;
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      app: 'classtick',
      time: new Date().toISOString(),
      push: pushApi ? pushApi.status() : { available: false }
    }));
    return;
  }

  if (/^\/(push-data|node_modules|android|native|\.git)(\/|$)/.test(pathname) ||
      /^\/(package(-lock)?\.json|capacitor\.config\.json)$/.test(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  if (pathname.startsWith('/api/push/')) {
    if (!pushApi) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: 'web-push 未安装，运行 npm install 后重启' }));
      return;
    }
    await pushApi.handle(req, res, pathname);
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = normalize(join(ROOT, pathname));
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>404</title><p style="font:16px system-ui;padding:40px">课刻：没有找到这个文件 → ' + pathname.replace(/[<>&]/g, '') + '</p>');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const isHtml = ext === '.html';
  const isServiceWorker = filePath.endsWith('sw.js');
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isHtml || isServiceWorker ? 'no-cache' : 'public, max-age=3600',
    'Service-Worker-Allowed': '/',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  createReadStream(filePath).pipe(res);
  if (!isHtml) {
    res.on('finish', () => {
      if (process.env.CLASSTICK_VERBOSE) {
        console.log(`  ${req.method} ${pathname} → ${res.statusCode} (${Date.now() - t0}ms)`);
      }
    });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n端口 ${PORT} 已被占用：可能课刻已经在运行。`);
    console.error(`直接打开 http://localhost:${PORT}/ 即可，或换一个端口：node server.mjs 8789\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const lines = [];
  lines.push('');
  lines.push('  ┌──────────────────────────────────────────────┐');
  lines.push('  │  课刻 ClassTick · 课程表小组件 已启动          │');
  lines.push('  └──────────────────────────────────────────────┘');
  lines.push('');
  lines.push(`  电脑打开：  http://localhost:${PORT}/`);
  lines.push(`  小组件窗口：http://localhost:${PORT}/?widget=1`);
  lines.push('');
  const lans = lanUrls(PORT);
  if (lans.length) {
    lines.push('  手机（同一 Wi-Fi）可以试试：');
    for (const item of lans) lines.push(`    ${item.url}   (${item.name})`);
    lines.push('  提示：局域网 http 地址能看课表，但安装 PWA / 系统通知需要 https 或手机本机。');
  }
  lines.push('');
  lines.push('  按 Ctrl+C 停止服务。');
  lines.push('');
  console.log(lines.join('\n'));
});
