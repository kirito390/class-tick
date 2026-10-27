/* 课刻 ClassTick · Service Worker：离线缓存 + 通知点击回到课表 */
const CACHE = 'classtick-v1.6.0-push';
const ASSETS = [
  './',
  './index.html',
  './assets/style.css',
  './assets/core.js',
  './assets/seed.js',
  './assets/app.js',
  './manifest.webmanifest',
  './assets/royal.css',
  './assets/royal/hero-castle.webp',
  './assets/royal/parchment.webp',
  './assets/royal/corner-tl.webp',
  './assets/royal/corner-tr.webp',
  './assets/royal/corner-bl.webp',
  './assets/royal/corner-br.webp',
  './assets/royal/crown.webp',
  './assets/royal/seal.webp',
  './assets/royal/rose-window.webp',
  './assets/teacher.css',
  './assets/teacher/full.webp',
  './assets/teacher/bust.webp',
  './assets/teacher/avatar.webp',
  './assets/teacher/thinking.webp',
  './assets/teacher/chibi.webp',
  './assets/teacher/full-star.webp',
  './assets/teacher/full-rose.webp',
  './assets/royal-polish.css',
  './assets/planner.css',
  './assets/court.css',
  './assets/royal/castle-crest.webp',
  './assets/royal/castle-badge.webp',
  './assets/royal/court-thumb-knight.webp',
  './assets/royal/court-thumb-king.webp',
  './assets/royal/court-thumb-queen.webp',
  './assets/royal/knight.webp',
  './assets/royal/king.webp',
  './assets/royal/queen.webp',
  './assets/royal/court-face-knight.webp',
  './assets/royal/court-face-king.webp',
  './assets/royal/court-face-queen.webp',
  './assets/teacher/full-witch.webp',
  './assets/teacher/full-blink.webp',
  './assets/teacher/full-talk.webp',
  './assets/teacher/full-smile.webp',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/badge-96.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，断网时回退到缓存的首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // 静态资源：缓存优先，后台更新
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: '课刻传令', body: String(event.data || '') }; }
  const title = data.title || '课刻传令';
  const options = {
    body: data.body || '',
    icon: './assets/teacher/chibi.webp',
    badge: './icons/badge-96.png',
    tag: data.tag || 'classtick-push',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url || './?tab=today', kind: data.kind || '' },
    vibrate: data.requireInteraction ? [90, 60, 90, 60, 160] : [60, 40, 60]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './?tab=today';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client && client.url.indexOf(target) === -1) {
            client.navigate(target).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return null;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting' && self.skipWaiting) self.skipWaiting();
});
