/**
 * 课刻 ClassTick · Web Push 后台传令服务
 * 目标：应用完全关闭后，仍能在课前 / 签到 / DDL 到点时收到系统通知。
 * 依赖：web-push（仅服务端使用；前端仍是零依赖 PWA）
 *
 * 数据目录：项目下 push-data/（自动创建，含 VAPID 私钥，请勿公开）
 * API（同源）：
 *   GET  /api/push/key          取 VAPID 公钥
 *   GET  /api/push/status       订阅数 / 数据状态 / 下一条传令
 *   POST /api/push/subscribe    提交 PushSubscription（可同时带 timetable）
 *   POST /api/push/unsubscribe  退订
 *   POST /api/push/sync         同步课表 / 设置 / 任务
 *   POST /api/push/test         给所有订阅发一条测试传令
 *   POST /api/push/selftest     用当前数据计算 7 天内传令（验收用）
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const require = createRequire(import.meta.url);
const C = require('./assets/core.js');

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const DATA_DIR = join(ROOT, 'push-data');
const VAPID_FILE = join(DATA_DIR, 'vapid.json');
const SUBS_FILE = join(DATA_DIR, 'subscriptions.json');
const DATA_FILE = join(DATA_DIR, 'timetable.json');
const FIRED_FILE = join(DATA_DIR, 'fired.json');

mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file, fallback) {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  renameSync(tmp, file);
}

// ---------------------------------------------------------------- VAPID
let vapid = readJSON(VAPID_FILE, null);
if (!vapid || !vapid.publicKey || !vapid.privateKey) {
  vapid = webpush.generateVAPIDKeys();
  writeJSON(VAPID_FILE, vapid);
  console.log('  [push] 已生成新的 VAPID 密钥：push-data/vapid.json');
}
webpush.setVapidDetails('mailto:hello@classtick.local', vapid.publicKey, vapid.privateKey);

// ---------------------------------------------------------------- 订阅与数据
let subscriptions = readJSON(SUBS_FILE, []);
let timetable = readJSON(DATA_FILE, null);
let fired = readJSON(FIRED_FILE, {});

function saveSubs() { writeJSON(SUBS_FILE, subscriptions); }
function saveFired() { writeJSON(FIRED_FILE, fired); }

function pruneFired() {
  const cutoff = Date.now() - 7 * 86400000;
  let changed = false;
  Object.keys(fired).forEach((key) => {
    if (fired[key] < cutoff) { delete fired[key]; changed = true; }
  });
  if (changed) saveFired();
}

function reminderList(from, to) {
  if (!timetable || !Array.isArray(timetable.courses)) return [];
  const data = C.normalizeData(timetable);
  const list = C.buildReminders(data, from, to).concat(C.buildTaskReminders(data, from, to));
  list.sort((a, b) => a.at - b.at);
  return list;
}

function nextReminder() {
  const now = new Date();
  const list = reminderList(new Date(now.getTime() - 86400000), new Date(now.getTime() + 8 * 86400000));
  return list.filter((r) => r.at.getTime() > now.getTime())[0] || null;
}

function publicStatus() {
  const next = nextReminder();
  return {
    ok: true,
    subscribed: subscriptions.length,
    hasData: !!timetable,
    vapidPublicKey: vapid.publicKey,
    next: next ? { key: next.key, kind: next.kind, at: next.at.toISOString(), title: next.title, body: next.body } : null
  };
}

// ---------------------------------------------------------------- 发送
async function sendToSubscriptions(payload) {
  const body = JSON.stringify(payload);
  const results = [];
  for (const sub of subscriptions.slice()) {
    try {
      await webpush.sendNotification(sub, body, { TTL: 3600, urgency: payload.requireInteraction ? 'high' : 'normal' });
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (err) {
      const status = err && err.statusCode;
      results.push({ endpoint: sub.endpoint, ok: false, status });
      if (status === 404 || status === 410) {
        subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
        saveSubs();
      }
    }
  }
  return results;
}

async function fireReminder(r) {
  fired[r.key] = Date.now();
  saveFired();
  const payload = {
    title: r.title,
    body: r.body,
    tag: r.key,
    kind: r.kind,
    url: './?tab=' + (r.kind === 'task' || r.kind === 'task-eve' ? 'planner' : 'today'),
    requireInteraction: r.kind === 'sign',
    timestamp: Date.now()
  };
  const results = await sendToSubscriptions(payload);
  const ok = results.filter((x) => x.ok).length;
  console.log(`  [push] ${new Date().toLocaleTimeString('zh-CN')} ${r.kind} · ${r.title} → ${ok}/${results.length} 成功`);
  return results;
}

// ---------------------------------------------------------------- 调度
let ticking = false;
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    pruneFired();
    const now = Date.now();
    const list = reminderList(new Date(now - 86400000), new Date(now + 86400000));
    for (const r of list) {
      const diff = now - r.at.getTime();
      if (diff < -5000 || diff > 120000) continue;
      if (fired[r.key]) continue;
      await fireReminder(r);
    }
  } catch (err) {
    console.error('  [push] 调度异常：', err.message);
  } finally {
    ticking = false;
  }
}

const timer = setInterval(tick, 20000);
timer.unref?.();
setTimeout(tick, 1500);

// ---------------------------------------------------------------- HTTP API
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (err) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function validSubscription(sub) {
  return sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) &&
    sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
}

export async function handle(req, res, pathname) {
  try {
    if (pathname === '/api/push/key' && req.method === 'GET') {
      return json(res, 200, { ok: true, publicKey: vapid.publicKey });
    }
    if (pathname === '/api/push/status' && req.method === 'GET') {
      return json(res, 200, publicStatus());
    }
    if (pathname === '/api/push/subscribe' && req.method === 'POST') {
      const body = await readBody(req);
      if (!validSubscription(body.subscription)) return json(res, 400, { ok: false, error: 'invalid subscription' });
      const sub = {
        endpoint: body.subscription.endpoint,
        expirationTime: body.subscription.expirationTime || null,
        keys: body.subscription.keys,
        ua: String(req.headers['user-agent'] || '').slice(0, 200),
        addedAt: new Date().toISOString()
      };
      subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
      subscriptions.push(sub);
      saveSubs();
      if (body.data) {
        timetable = body.data;
        writeJSON(DATA_FILE, timetable);
      }
      return json(res, 200, { ok: true, subscribed: subscriptions.length, next: publicStatus().next });
    }
    if (pathname === '/api/push/unsubscribe' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.endpoint) return json(res, 400, { ok: false, error: 'missing endpoint' });
      subscriptions = subscriptions.filter((s) => s.endpoint !== body.endpoint);
      saveSubs();
      return json(res, 200, { ok: true, subscribed: subscriptions.length });
    }
    if (pathname === '/api/push/sync' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.data || !Array.isArray(body.data.courses)) return json(res, 400, { ok: false, error: 'invalid data' });
      timetable = body.data;
      writeJSON(DATA_FILE, timetable);
      return json(res, 200, { ok: true, next: publicStatus().next });
    }
    if (pathname === '/api/push/test' && req.method === 'POST') {
      const results = await sendToSubscriptions({
        title: '课刻 · 后台传令测试',
        body: '如果你在应用完全关闭时看到这条，说明 Web Push 链路已经打通。',
        tag: 'classtick-push-test',
        kind: 'test',
        url: './?tab=settings',
        timestamp: Date.now()
      });
      return json(res, 200, { ok: true, sent: results.filter((x) => x.ok).length, total: results.length, results });
    }
    if (pathname === '/api/push/selftest' && req.method === 'POST') {
      const body = await readBody(req);
      const data = body.data && Array.isArray(body.data.courses) ? body.data : timetable;
      if (!data) return json(res, 400, { ok: false, error: 'no timetable' });
      const normalized = C.normalizeData(data);
      const now = new Date();
      const list = C.buildReminders(normalized, now, new Date(now.getTime() + 7 * 86400000))
        .concat(C.buildTaskReminders(normalized, now, new Date(now.getTime() + 7 * 86400000)));
      return json(res, 200, {
        ok: true,
        count: list.length,
        next: list.slice(0, 5).map((r) => ({ at: r.at.toISOString(), kind: r.kind, title: r.title, body: r.body }))
      });
    }
    return json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message });
  }
}

export function start() {
  const next = nextReminder();
  console.log('  [push] Web Push 已就绪' + (next
    ? `；下一条：${next.at.toLocaleString('zh-CN')} ${next.title}`
    : '；尚无课表数据，打开课刻同步后自动排程'));
}

export function status() {
  return { subscribed: subscriptions.length, hasData: !!timetable, next: nextReminder() };
}
