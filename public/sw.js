const CACHE_NAME = 'mandarin-hsk-studio-v3';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap'
];

// Pre-warm stroke data for Core Unit 1 & Stroke Dojo characters so offline calligraphy works immediately
const PREWARM_HANZI_DATA = [
  '你', '好', '谢', '再', '见', '朋', '友', '学', '习', '水', '茶',
  '十', '工', '干', '王', '人', '八', '入', '木', '文', '三', '早',
  '立', '的', '明', '林', '休', '月', '同', '问', '风', '日', '国',
  '回', '田', '小', '办', '永'
].map((ch) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(ch)}.json`);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        [...CORE_ASSETS, ...PREWARM_HANZI_DATA].map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => {
              if (res && (res.ok || res.type === 'opaque')) {
                return cache.put(url, res);
              }
            })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Vite HMR / WebSocket endpoints if running in dev
  if (url.pathname.includes('/@vite') || url.pathname.includes('/__vite')) {
    return;
  }

  // Cache-first strategy for HanziWriter CDN scripts, character stroke JSONs, and Google Fonts
  const isCacheFirstCDN =
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isCacheFirstCDN) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && (response.status === 200 || response.type === 'opaque')) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Stale-while-revalidate for local HTML, manifest, icons, and modular JS/CSS assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            url.origin === self.location.origin
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return cachedResponse;
        });

      return cachedResponse || networkFetch;
    })
  );
});
