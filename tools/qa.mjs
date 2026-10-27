#!/usr/bin/env node
/**
 * 课刻 ClassTick · 视觉与自测验收脚本
 * 思路：自己拉起 headless Chrome（远程调试端口），再用 puppeteer.connect 接管，
 *       避免 puppeteer.launch 在当前环境下的启动问题。
 *
 * 用法：node tools/qa.mjs [--url http://127.0.0.1:8788]
 * 产物：shots/*.png，自测结果打印到终端
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SHOTS = join(ROOT, 'shots');
mkdirSync(SHOTS, { recursive: true });

const candidates = [
  process.env.PUPPETEER_CORE,
  'C:/Users/27072/Documents/deepseek-harness/default-workspace/work/bday/node_modules/puppeteer-core'
].filter(Boolean);
let puppeteer = null;
for (const c of candidates) {
  try { puppeteer = require(c); break; } catch { /* try next */ }
}
if (!puppeteer) {
  console.error('找不到 puppeteer-core，可用 PUPPETEER_CORE 环境变量指定路径');
  process.exit(1);
}

const argv = process.argv.slice(2);
const urlArgIdx = argv.indexOf('--url');
const BASE = urlArgIdx >= 0 ? argv[urlArgIdx + 1] : 'http://127.0.0.1:8788';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9300 + Math.floor(Math.random() * 300);
const PROFILE = 'C:/Users/27072/AppData/Local/Temp/classtick-qa-' + Date.now();

const shots = [
  { name: 'mobile-today', width: 430, height: 940, url: '/?now=2026-10-26T07:40', mobile: true, scale: 2 },
  { name: 'mobile-week', width: 430, height: 940, url: '/?now=2026-10-26T09:10&tab=week', mobile: true, scale: 2 },
  { name: 'mobile-courses', width: 430, height: 940, url: '/?now=2026-10-26T07:40&tab=courses', mobile: true, scale: 2 },
  { name: 'mobile-settings', width: 430, height: 940, url: '/?now=2026-10-26T07:40&tab=settings', mobile: true, scale: 2 },
  { name: 'desktop-today', width: 1440, height: 1020, url: '/?now=2026-10-26T07:40', scale: 1.5 },
  { name: 'desktop-week', width: 1440, height: 1020, url: '/?now=2026-10-26T09:10&tab=week', scale: 1.5 },
  { name: 'widget', width: 396, height: 780, url: '/?now=2026-10-26T07:40&widget=1', scale: 2 },
  { name: 'mobile-dark', width: 430, height: 940, url: '/?now=2026-10-26T07:40&theme=dark', mobile: true, scale: 2 },
  { name: 'mobile-now-class', width: 430, height: 940, url: '/?now=2026-10-26T08:20', mobile: true, scale: 2 },
  { name: 'desktop-sunday', width: 1440, height: 900, url: '/?now=2026-10-25T10:00', scale: 1.5 },
  { name: 'classic-today', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&skin=classic', scale: 1.5 },
  { name: 'teacher-desktop', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1', scale: 1.5, wait: 1100 },
  { name: 'teacher-mobile', width: 430, height: 940, url: '/?now=2026-10-26T07:40&teacher=1', mobile: true, scale: 2, wait: 1100 },
  { name: 'teacher-dark', width: 430, height: 940, url: '/?now=2026-10-26T07:40&teacher=1&theme=dark', mobile: true, scale: 2, wait: 1100 },
  { name: 'teacher-star', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1&outfit=star', scale: 1.5, wait: 1100 },
  { name: 'teacher-rose', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1&outfit=rose', scale: 1.5, wait: 1100 },
  { name: 'planner', width: 1440, height: 1020, url: '/?now=2026-10-26T07:40&tab=planner', scale: 1.5 },
  { name: 'planner-mobile', width: 430, height: 940, url: '/?now=2026-10-26T07:40&tab=planner', mobile: true, scale: 2 },
  { name: 'day-view', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&date=2026-10-27', scale: 1.5 },
  { name: 'court', width: 1440, height: 1100, url: '/?now=2026-10-26T07:40&court=1', scale: 1.5, wait: 900 },
  { name: 'court-mobile', width: 430, height: 940, url: '/?now=2026-10-26T07:40&court=1', mobile: true, scale: 2, wait: 900 },
  { name: 'teacher-witch', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1&outfit=witch', scale: 1.5, wait: 1100 },
  { name: 'teacher-blink', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1&expression=blink', scale: 1.5, wait: 1400 },
  { name: 'teacher-talk', width: 1440, height: 1000, url: '/?now=2026-10-26T07:40&teacher=1&expression=talk', scale: 1.5, wait: 1400 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 拉起浏览器 ----
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  'about:blank'
], { stdio: 'ignore', windowsHide: true });

let browser = null;
for (let i = 0; i < 40 && !browser; i++) {
  await sleep(300);
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  } catch { /* not ready */ }
}
if (!browser) {
  console.error('浏览器没有启动起来（端口 ' + PORT + '）');
  chrome.kill();
  process.exit(1);
}
console.log('已连接 headless Chrome，开始验收…\n');

const errors = [];
let failed = 0;

try {
  for (const shot of shots) {
    const page = await browser.newPage();
    page.on('pageerror', (err) => errors.push(`[${shot.name}] pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[${shot.name}] console.error: ${msg.text()}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) errors.push(`[${shot.name}] HTTP ${res.status()} ${res.url()}`);
    });
    await page.setViewport({
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.scale || 1,
      isMobile: !!shot.mobile,
      hasTouch: !!shot.mobile
    });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(BASE + shot.url, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(shot.wait || 400);
    await page.screenshot({ path: join(SHOTS, shot.name + '.png') });
    const title = await page.title();
    const view = await page.evaluate(() => {
      const active = document.querySelector('.view.is-active');
      return {
        selftest: document.documentElement.dataset.selftest || '',
        theme: document.documentElement.dataset.theme || '',
        skin: document.documentElement.dataset.skin || '',
        hero: (document.querySelector('.hero-course') || {}).textContent || '',
        view: active ? active.id : '(none)',
        bodyH: document.body.scrollHeight
      };
    });
    console.log(`  📸 ${shot.name}.png  ${shot.width}x${shot.height}  视图=${view.view} 皮肤=${view.skin}  Hero=「${String(view.hero).trim()}」  页高=${view.bodyH}`);
    await page.close();
  }

  // ---- 页面内自测 ----
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push('console: ' + msg.text());
  });
  await page.setViewport({ width: 430, height: 940, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE + '/?selftest=1&now=2026-10-26T07:40', { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.dataset.selftest, { timeout: 12000 });
  const verdict = await page.evaluate(() => document.documentElement.dataset.selftest);
  const detail = await page.evaluate(() => {
    const el = document.getElementById('selftest-out');
    return el ? el.textContent : '(no detail)';
  });
  await page.screenshot({ path: join(SHOTS, 'selftest.png') });
  console.log('\n=== 页面内自测 ===\n' + detail);
  console.log('\n自测结论：' + verdict);
  if (!/^PASS/.test(verdict || '')) failed++;
  if (pageErrors.length) {
    console.log('\n页面脚本错误：');
    pageErrors.forEach((e) => console.log('  ✗ ' + e));
    failed++;
  }
  await page.close();

  // ---- 单文件版（手机直接打开）----
  const singlePath = join(ROOT, 'dist', '课刻-手机版.html');
  const single = await browser.newPage();
  const singleErrors = [];
  single.on('pageerror', (e) => singleErrors.push(e.message));
  single.on('requestfailed', (req) => singleErrors.push('requestfailed: ' + req.url().slice(0, 80)));
  await single.setViewport({ width: 430, height: 940, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await single.goto(pathToFileURL(singlePath).href + '?now=2026-10-26T07:40', { waitUntil: 'load', timeout: 20000 });
  await sleep(500);
  const singleInfo = await single.evaluate(() => ({
    hero: (document.querySelector('.hero-course') || {}).textContent || '',
    items: document.querySelectorAll('#timeline .tl-item').length,
    installHidden: getComputedStyle(document.querySelector('#btn-install')).display === 'none',
    theme: document.documentElement.dataset.theme || '',
    skin: document.documentElement.dataset.skin || '',
    royalInline: (getComputedStyle(document.querySelector('.panel'), '::before').backgroundImage || '').indexOf('data:image/webp') >= 0,
    teacherInline: (() => { const img = document.querySelector('.teacher-fab-img'); return !!(img && img.src && img.src.indexOf('data:image/webp') >= 0); })(),
    heroInline: (getComputedStyle(document.querySelector('.hero')).backgroundImage || '').indexOf('data:image/webp') >= 0,
    selftest: document.documentElement.dataset.selftest || ''
  }));
  const singleOutfit = await single.evaluate(() => {
    if (!window.__classtickTeacher) return { ok: false, src: '' };
    window.__classtickTeacher.setOutfit('star');
    const src = document.getElementById('teacher-art').getAttribute('src') || '';
    window.__classtickTeacher.setOutfit('court');
    return { ok: src.indexOf('data:image/webp') === 0, src: src.slice(0, 24) };
  });
  await single.screenshot({ path: join(SHOTS, 'single-file-mobile.png') });
  console.log('\n=== 单文件版（file:// 打开）===');
  console.log('  Hero=「' + String(singleInfo.hero).trim() + '」 今日课程=' + singleInfo.items +
    ' 皮肤=' + singleInfo.skin + ' 素材已内联=' + (singleInfo.royalInline && singleInfo.heroInline) +
    ' 换装=' + (singleOutfit.ok ? 'data URI' : '失败'));
  if (!singleInfo.hero || singleInfo.items !== 3 || singleInfo.skin !== 'royal' || !singleInfo.royalInline || !singleInfo.teacherInline || !singleOutfit.ok) {
    console.log('  ✗ 单文件版渲染异常');
    failed++;
  } else {
    console.log('  ✓ 单文件版离线可用（含皇室素材）');
  }
  if (singleErrors.length) {
    console.log('  单文件版错误：' + singleErrors.join(' | '));
    failed++;
  }
  await single.close();

  // ---- 弹层 / 提醒卡片 / Service Worker 检查 ----
  const extras = await browser.newPage();
  await extras.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
  await extras.goto(BASE + '/?now=2026-10-26T07:40', { waitUntil: 'networkidle0' });
  await sleep(1200);
  const swInfo = await extras.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys();
    const manifest = await fetch('manifest.webmanifest').then((r) => r.json()).catch(() => null);
    const panelBg = getComputedStyle(document.querySelector('.panel'), '::before').backgroundImage || '';
    return {
      sw: !!reg,
      cacheNames: keys,
      manifestName: manifest && manifest.name,
      manifestIcons: manifest ? manifest.icons.length : 0,
      installable: !!(manifest && manifest.start_url && manifest.display),
      skin: document.documentElement.dataset.skin || '',
      royalCorners: panelBg.indexOf('corner-tl.webp') >= 0,
      logoRoyal: !!document.querySelector('.logo-royal img'),
      heroBg: (getComputedStyle(document.querySelector('.hero')).backgroundImage || '').indexOf('hero-castle.webp') >= 0
    };
  });
  console.log('\n=== PWA 检查 ===');
  console.log('  Service Worker=' + (swInfo.sw ? '已注册' : '未注册') + '  缓存=' + (swInfo.cacheNames.join(',') || '无'));
  console.log('  manifest=' + swInfo.manifestName + '  图标=' + swInfo.manifestIcons + '  start_url/display=' + swInfo.installable);
  console.log('  皮肤=' + swInfo.skin + '  纹章图标=' + swInfo.logoRoyal + '  金线角花=' + swInfo.royalCorners + '  城堡主视觉=' + swInfo.heroBg);
  if (!swInfo.sw || !swInfo.installable || swInfo.skin !== 'royal' || !swInfo.logoRoyal) {
    console.log('  ✗ PWA / 皇室皮肤条件不完整');
    failed++;
  } else {
    console.log('  ✓ 具备 PWA 安装条件，皇室素材已加载');
  }

  // 课程编辑弹窗
  await extras.evaluate(() => document.querySelector('.tab[data-tab="courses"]').click());
  await sleep(300);
  await extras.click('[data-action="course-new"]');
  await sleep(400);
  await extras.screenshot({ path: join(SHOTS, 'dialog-course.png') });
  const dialogOpen = await extras.evaluate(() => document.getElementById('dlg-course').open);
  console.log('  课程编辑弹窗打开=' + dialogOpen);
  if (!dialogOpen) failed++;
  await extras.evaluate(() => document.getElementById('dlg-course').close());

  // 提醒卡片预览
  await extras.evaluate(() => {
    const tab = document.querySelector('.tab[data-tab="settings"]');
    if (tab) tab.click();
  });
  await sleep(300);
  await extras.click('[data-action="preview-reminder"]');
  await sleep(500);
  await extras.screenshot({ path: join(SHOTS, 'reminder-preview.png') });
  const reminderCount = await extras.evaluate(() => document.querySelectorAll('.reminder').length);
  console.log('  提醒卡片数量=' + reminderCount);
  if (!reminderCount) {
    console.log('  ✗ 提醒卡片没有出现');
    failed++;
  } else {
    console.log('  ✓ 提醒卡片可预览');
  }
  // 皇家导师：打开对话、检查立绘、验证意图改设置
  await extras.evaluate(() => {
    const tab = document.querySelector('.tab[data-tab="today"]');
    if (tab) tab.click();
  });
  await sleep(250);
  await extras.click('#teacher-fab');
  await sleep(900);
  await extras.screenshot({ path: join(SHOTS, 'teacher-chat.png') });
  const teacherInfo = await extras.evaluate(async () => {
    const dlg = document.getElementById('dlg-teacher');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const imgs = Array.from(dlg.querySelectorAll('img')).filter((img) => img.getAttribute('src')).map((img) => ({
      src: (img.getAttribute('src') || '').slice(0, 34),
      ok: img.complete && img.naturalWidth > 0
    }));
    const read = () => JSON.parse(localStorage.getItem('classtick.data.v1') || '{}').settings || {};
    const before = read();
    window.__classtickTeacher.try('签到提前 5 分钟');
    const after = read();
    window.__classtickTeacher.try('早报改到 6:30');
    const digestAfter = read().digestTime;
    window.__classtickTeacher.try('换成深色');
    const themeAfter = read().theme;
    window.__classtickTeacher.try('换回学院皮肤');
    const skinAfter = read().skin;
    window.__classtickTeacher.try('签到提前 2 分钟');
    window.__classtickTeacher.try('早报改到 7:20');
    window.__classtickTeacher.try('跟随系统主题');
    window.__classtickTeacher.try('换回皇室');
    const suitOk = window.__classtickTeacher.setOutfit('star') &&
      (document.getElementById('teacher-art').getAttribute('src') || '').indexOf('full-star') >= 0;
    window.__classtickTeacher.setOutfit('court');
    const enCount = document.querySelectorAll('.h2-en').length;
    const kickerEn = !!document.querySelector('.kicker-en');
    const aura = !!document.querySelector('.royal-aura');
    const costumeLoad = await Promise.all(['full-star.webp', 'full-rose.webp'].map(function (file) {
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () { resolve(img.naturalWidth > 0); };
        img.onerror = function () { resolve(false); };
        img.src = 'assets/teacher/' + file;
      });
    }));
    let llmError = '';
    window.__classtickTeacher.llm.configure({ llmOn: true, llmBase: 'http://127.0.0.1:9/v1', llmKey: 'test', llmModel: 'test' });
    try { await window.__classtickTeacher.llm.ask('你好'); } catch (err) { llmError = String((err && err.message) || err); }
    window.__classtickTeacher.llm.configure({ llmOn: false, llmBase: 'https://api.deepseek.com/v1', llmKey: '', llmModel: 'deepseek-chat' });
    return {
      open: dlg.open,
      messages: dlg.querySelectorAll('.teacher-msg').length,
      imgs,
      signBefore: before.signMin,
      signAfter: after.signMin,
      digestAfter,
      themeAfter,
      skinAfter,
      suitOk,
      enCount,
      kickerEn,
      aura,
      costumeLoad,
      llmError,
      fabVisible: !document.getElementById('teacher-dock').hidden
    };
  });
  console.log('');
  // 后台传令 API + 设置面板
  const pushInfo = await extras.evaluate(async () => {
    const status = await fetch('/api/push/status').then((r) => r.json()).catch((e) => ({ error: String(e) }));
    const keys = await fetch('/api/push/key').then((r) => r.json()).catch((e) => ({ error: String(e) }));
    const data = window.__classtickPush ? window.__classtickPush.data() : null;
    const selftest = data ? await fetch('/api/push/selftest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data })
    }).then((r) => r.json()).catch((e) => ({ error: String(e) })) : { error: 'no data' };
    const panel = document.querySelector('.push-panel');
    const btn = document.querySelector('[data-action="push-enable"]');
    return {
      hasKey: !!(keys && keys.publicKey),
      statusOk: !!(status && status.ok),
      subscribed: status ? status.subscribed : null,
      selftestCount: selftest ? selftest.count : null,
      panel: !!panel,
      button: !!btn
    };
  });
  console.log('\n=== Web Push 后台传令 ===');
  console.log('  VAPID=' + pushInfo.hasKey + ' 服务=' + pushInfo.statusOk + ' 订阅数=' + pushInfo.subscribed +
    ' 7日提醒=' + pushInfo.selftestCount + ' 面板=' + pushInfo.panel + ' 开启按钮=' + pushInfo.button);
  if (!pushInfo.hasKey || !pushInfo.statusOk || pushInfo.selftestCount < 1 || !pushInfo.panel || !pushInfo.button) {
    console.log('  ✗ Web Push 检查未通过');
    failed++;
  } else {
    console.log('  ✓ Web Push 服务端与设置面板均就绪');
  }

  // 表情帧与动作
  const expressionInfo = await extras.evaluate(async () => {
    window.__classtickTeacher.setOutfit('court');
    window.__classtickTeacher.setExpression('blink', 0);
    await new Promise((r) => setTimeout(r, 80));
    const img = document.getElementById('teacher-expression');
    const blinkOk = (img.getAttribute('src') || '').indexOf('full-blink') >= 0 && img.style.opacity === '1';
    window.__classtickTeacher.setExpression(null);
    window.__classtickTeacher.motion('bow', 800);
    const motionOk = document.querySelector('.teacher-stage').dataset.motion === 'bow';
    return { blinkOk, motionOk };
  });
  console.log('\n=== 表情 / 动作 ===');
  console.log('  眨眼帧=' + expressionInfo.blinkOk + ' 动作=' + expressionInfo.motionOk);
  if (!expressionInfo.blinkOk || !expressionInfo.motionOk) { console.log('  ✗ 表情/动作未通过'); failed++; }
  else console.log('  ✓ Sunburst 表情帧与多动作正常');

  const courtInfo = await extras.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('.court-card img, .brand-castle img, #court-witch-img'));
    const loaded = await Promise.all(imgs.map((img) => new Promise((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve(true);
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 2500);
    })));
    window.__classtickTeacher.setOutfit('witch');
    const witchSrc = document.getElementById('teacher-art').getAttribute('src') || '';
    window.__classtickTeacher.setOutfit('court');
    document.querySelector('[data-action="court-open"]').click();
    await new Promise((r) => setTimeout(r, 120));
    const dlg = document.getElementById('dlg-court');
    const opened = !!(dlg && dlg.open);
    const fullCards = dlg ? dlg.querySelectorAll('.court-full-card').length : 0;
    if (dlg && dlg.open) dlg.close();
    return {
      cards: document.querySelectorAll('.court-card').length,
      loaded: loaded.length > 0 && loaded.every(Boolean),
      witch: witchSrc.indexOf('full-witch') >= 0,
      opened, fullCards
    };
  });
  console.log('\n=== 王廷 / 魔女 ===');
  console.log('  王廷卡片=' + courtInfo.cards + ' 素材加载=' + courtInfo.loaded +
    ' 魔女装=' + courtInfo.witch + ' 档案弹层=' + courtInfo.opened + ' 档案卡=' + courtInfo.fullCards);
  if (courtInfo.cards !== 4 || !courtInfo.loaded || !courtInfo.witch || !courtInfo.opened || courtInfo.fullCards !== 4) {
    console.log('  ✗ 王廷/魔女检查未通过');
    failed++;
  } else {
    console.log('  ✓ 王廷素材、档案与魔女装均正常');
  }

  console.log('=== 皇家导师 ===');
  console.log('  对话打开=' + teacherInfo.open + '  消息=' + teacherInfo.messages +
    '  悬浮头像=' + teacherInfo.fabVisible + '  签到意图：' + teacherInfo.signBefore + ' → ' + teacherInfo.signAfter);
  console.log('  其他意图：早报=' + teacherInfo.digestAfter + '  主题=' + teacherInfo.themeAfter + '  皮肤=' + teacherInfo.skinAfter);
  console.log('  换装=' + teacherInfo.suitOk + '  英文标=' + teacherInfo.enCount + '  Hero英文=' + teacherInfo.kickerEn + '  动效层=' + teacherInfo.aura);
  console.log('  礼服立绘=' + teacherInfo.costumeLoad.join(',') + '  LLM 失败兜底=' + (teacherInfo.llmError ? '已捕获(' + teacherInfo.llmError.slice(0, 24) + ')' : '未触发'));
  teacherInfo.imgs.forEach((img) => console.log('  立绘 ' + img.src + ' … ' + (img.ok ? '已加载' : '加载失败')));
  if (!teacherInfo.open || teacherInfo.messages < 2 || teacherInfo.signAfter !== 5 || !teacherInfo.fabVisible ||
      teacherInfo.digestAfter !== '06:30' || teacherInfo.themeAfter !== 'dark' || teacherInfo.skinAfter !== 'classic' ||
      !teacherInfo.suitOk || teacherInfo.enCount < 3 || !teacherInfo.kickerEn || !teacherInfo.aura ||
      teacherInfo.costumeLoad.some((ok) => !ok) || !teacherInfo.llmError ||
      teacherInfo.imgs.some((img) => !img.ok)) {
    console.log('  ✗ 皇家导师检查未通过');
    failed++;
  } else {
    console.log('  ✓ 皇家导师对话、立绘与意图改设置均正常');
  }

  // 点击涟漪与 AI 面板截图
  const rippleOk = await extras.evaluate(async () => {
    const btn = document.createElement('button');
    btn.className = 'text-btn';
    btn.textContent = 'ripple-test';
    btn.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999';
    document.body.appendChild(btn);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20 }));
    await new Promise((r) => setTimeout(r, 40));
    const ok = btn.querySelectorAll('.ripple').length > 0;
    btn.remove();
    return ok;
  });
  console.log('  点击涟漪=' + rippleOk + (rippleOk ? '' : '（可能被 reduced-motion 关闭）'));
  await extras.evaluate(() => {
    if (window.__classtickTeacher) window.__classtickTeacher.close();
    document.querySelectorAll('.reminder').forEach(function (node) { node.remove(); });
    const tab = document.querySelector('.tab[data-tab="settings"]');
    if (tab) tab.click();
    window.scrollTo(0, document.body.scrollHeight);
  });
  await sleep(500);
  await extras.screenshot({ path: join(SHOTS, 'settings-ai.png') });
  // 日程 / 行囊 / 日期切换
  const plannerInfo = await extras.evaluate(async () => {
    const out = {};
    const id = window.__classtickPlanner.add({ title: 'QA 作业', type: 'homework', due: '2026-10-26', time: '23:59', remindMin: 60 });
    const task = (window.__classtickPlanner && document.querySelector('#planner-list')) ? null : null;
    document.querySelector('.tab[data-tab="planner"]').click();
    await new Promise((r) => setTimeout(r, 80));
    out.plannerView = document.getElementById('view-planner').classList.contains('is-active');
    out.taskCards = document.querySelectorAll('#planner-list .task-item').length;
    out.taskReminders = window.__classtickPlanner ? 'ok' : 'missing';
    const tasksBefore = document.querySelectorAll('#planner-list .task-item').length;
    window.__classtickPlanner.toggle(id);
    await new Promise((r) => setTimeout(r, 60));
    window.__classtickPlanner.filter('done');
    await new Promise((r) => setTimeout(r, 60));
    out.done = !!document.querySelector('#planner-list .task-item.is-done');
    out.tasksBefore = tasksBefore;
    window.__classtickPlanner.filter('open');
    window.__classtickPlanner.remove(id);

    document.querySelector('.tab[data-tab="today"]').click();
    await new Promise((r) => setTimeout(r, 80));
    const chip = document.querySelector('#side-bring [data-action="toggle-packed"]');
    if (chip) {
      chip.click();
      await new Promise((r) => setTimeout(r, 60));
      out.packed = chip.classList.contains('is-packed') || !!document.querySelector('#side-bring .bring-chip.is-packed');
      const again = document.querySelector('#side-bring [data-action="toggle-packed"]');
      if (again) again.click();
    }
    const ds = Array.from(document.querySelectorAll('#day-switch .ds-day'));
    out.dayCount = ds.length;
    const other = ds.filter((d) => !d.classList.contains('is-active'))[0];
    if (other) {
      other.click();
      await new Promise((r) => setTimeout(r, 80));
      out.dayTitle = (document.querySelector('#today-title') || {}).textContent || '';
      out.dayBack = !!document.querySelector('[data-action="goto-today"]');
      const back = document.querySelector('[data-action="goto-today"]');
      if (back) back.click();
    }
    return out;
  });
  console.log('\n=== 日程 / 行囊 / 日期切换 ===');
  console.log('  日程页=' + plannerInfo.plannerView + ' 任务卡=' + plannerInfo.taskCards +
    ' 完成态=' + plannerInfo.done + ' 行囊勾选=' + plannerInfo.packed +
    ' 日期按钮=' + plannerInfo.dayCount + ' 切换标题=' + (plannerInfo.dayTitle || '').trim() +
    ' 回到今天=' + plannerInfo.dayBack);
  if (!plannerInfo.plannerView || plannerInfo.taskCards < 1 || !plannerInfo.done ||
      !plannerInfo.packed || plannerInfo.dayCount < 7 || !plannerInfo.dayBack) {
    console.log('  ✗ 日程/行囊/日期检查未通过');
    failed++;
  } else {
    console.log('  ✓ 日程、行囊勾选与日期切换均正常');
  }

  // 安装说明弹层：可滚动、页脚与关闭可见
  await extras.evaluate(() => { document.querySelector('[data-action="install"]').click(); });
  await sleep(450);
  await extras.screenshot({ path: join(SHOTS, 'install-guide.png') });
  const aboutInfo = await extras.evaluate(() => {
    const dlg = document.getElementById('dlg-about');
    const body = document.getElementById('about-body');
    body.scrollTop = body.scrollHeight;
    const foot = dlg.querySelector('.sheet-foot').getBoundingClientRect();
    const closeBtn = dlg.querySelector('[data-action="close-dialog"]').getBoundingClientRect();
    return {
      open: dlg.open,
      scrollable: body.scrollHeight > body.clientHeight + 4,
      scrolled: body.scrollTop > 0,
      footerVisible: foot.bottom <= window.innerHeight + 1,
      closeVisible: closeBtn.width > 0,
      clientH: body.clientHeight,
      scrollH: body.scrollHeight
    };
  });
  console.log('\n=== 安装说明弹层 ===');
  console.log('  可滚动=' + aboutInfo.scrollable + ' 已滚动=' + aboutInfo.scrolled +
    ' 页脚可见=' + aboutInfo.footerVisible + ' 关闭可见=' + aboutInfo.closeVisible +
    ' (' + aboutInfo.scrollH + '/' + aboutInfo.clientH + ')');
  if (!aboutInfo.open || !aboutInfo.scrollable || !aboutInfo.scrolled || !aboutInfo.footerVisible || !aboutInfo.closeVisible) {
    console.log('  ✗ 安装说明弹层检查未通过');
    failed++;
  } else {
    console.log('  ✓ 安装说明可完整滚动查看');
  }
  await extras.evaluate(() => { const d = document.getElementById('dlg-about'); if (d && d.open) d.close(); });

  // 导师：关闭入口 / 弹层内 toast / 关闭后重开
  await extras.evaluate(() => { const fab = document.getElementById('teacher-fab'); if (fab) fab.click(); });
  await sleep(800);
  const teacherFix = await extras.evaluate(async () => {
    const dlg = document.getElementById('dlg-teacher');
    const footClose = dlg.querySelector('.teacher-foot [data-action="close-dialog"]');
    const headClose = dlg.querySelector('.teacher-head-actions [data-action="close-dialog"]');
    const rect = (el) => { const b = el.getBoundingClientRect(); return { visible: b.width > 0 && b.height > 0, right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
    const before = { open: dlg.open, foot: rect(footClose), head: rect(headClose) };
    dlg.querySelector('[data-action="teacher-outfit"]').click();
    await new Promise((r) => setTimeout(r, 320));
    const toastInDialog = dlg.querySelectorAll('.toast-in-dialog, .teacher-flash').length;
    await new Promise((r) => setTimeout(r, 300));
    footClose.click();
    await new Promise((r) => setTimeout(r, 250));
    const closed = !dlg.open;
    const fab = document.getElementById('teacher-fab');
    if (fab) fab.click();
    await new Promise((r) => setTimeout(r, 650));
    const reopened = dlg.open;
    dlg.querySelector('.teacher-foot [data-action="close-dialog"]').click();
    return { before, toastInDialog, closed, reopened };
  });
  console.log('\n=== 导师关闭与反馈 ===');
  console.log('  打开=' + teacherFix.before.open + ' 头部关闭=' + teacherFix.before.head.visible +
    ' 底部关闭=' + teacherFix.before.foot.visible + ' 换装提示在弹层内=' + teacherFix.toastInDialog +
    ' 关闭成功=' + teacherFix.closed + ' 再次打开=' + teacherFix.reopened);
  if (!teacherFix.before.open || !teacherFix.before.head.visible || !teacherFix.before.foot.visible ||
      teacherFix.toastInDialog < 1 || !teacherFix.closed || !teacherFix.reopened) {
    console.log('  ✗ 导师关闭/反馈检查未通过');
    failed++;
  } else {
    console.log('  ✓ 导师关闭入口与换装提示均正常');
  }
  await extras.close();

  // ---- 交互冒烟：切标签、打开课程弹窗、导出 ICS ----
  const smoke = await browser.newPage();
  const smokeErrors = [];
  smoke.on('pageerror', (e) => smokeErrors.push(e.message));
  await smoke.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await smoke.goto(BASE + '/?now=2026-10-26T07:40', { waitUntil: 'networkidle0' });
  const smokeResult = await smoke.evaluate(async () => {
    const out = [];
    const click = (sel) => {
      const el = document.querySelector(sel);
      if (!el) { out.push('MISSING ' + sel); return false; }
      el.click();
      return true;
    };
    out.push('tab week: ' + (click('.tab[data-tab="week"]') && document.querySelector('#view-week').hidden === false));
    out.push('week blocks: ' + document.querySelectorAll('#week-scroll .wk-block').length);
    out.push('tab courses: ' + (click('.tab[data-tab="courses"]') && document.querySelectorAll('#course-list .course-card').length));
    out.push('tab settings: ' + (click('.tab[data-tab="settings"]') && document.querySelectorAll('#settings-root .panel').length));
    const skinSelect = document.querySelector('select[data-setting="skin"]');
    if (skinSelect) {
      skinSelect.value = 'classic';
      skinSelect.dispatchEvent(new Event('change', { bubbles: true }));
      out.push('切到学院纸感: ' + (document.documentElement.dataset.skin === 'classic') +
        ' / 标签=' + document.querySelector('.tab[data-tab="today"] span').textContent);
      const back = document.querySelector('select[data-setting="skin"]');
      if (back) {
        back.value = 'royal';
        back.dispatchEvent(new Event('change', { bubbles: true }));
      }
      out.push('切回皇室典藏: ' + (document.documentElement.dataset.skin === 'royal') +
        ' / 标签=' + document.querySelector('.tab[data-tab="today"] span').textContent);
    } else {
      out.push('皮肤选择器缺失');
    }
    click('[data-action="course-new"]');
    const dlg = document.getElementById('dlg-course');
    out.push('course dialog open: ' + dlg.open);
    const nameInput = document.querySelector('#course-form input[name="name"]');
    if (nameInput) nameInput.value = '测试课程';
    document.getElementById('course-form').requestSubmit();
    out.push('after submit courses: ' + document.querySelectorAll('#course-list .course-card').length);
    return out;
  });
  console.log('\n=== 交互冒烟 ===');
  smokeResult.forEach((line) => console.log('  · ' + line));
  if (smokeErrors.length) {
    console.log('  交互脚本错误：' + smokeErrors.join(' | '));
    failed++;
  }
  await smoke.close();
} finally {
  try { await browser.disconnect(); } catch { /* ignore */ }
  try { chrome.kill(); } catch { /* ignore */ }
}

if (errors.length) {
  console.log('\n截图过程中的错误：');
  [...new Set(errors)].forEach((e) => console.log('  ✗ ' + e));
  failed++;
} else {
  console.log('\n截图过程中没有控制台错误 ✓');
}

console.log('\n产物目录：' + SHOTS);
process.exit(failed ? 1 : 0);
