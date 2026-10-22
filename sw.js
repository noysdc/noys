// NOYS service worker — صفحات: اول شبکه | فایل‌های ثابت: اول کش | صوت: دست‌نخورده
// اگه CSS/JS/فونت رو عوض کردی و تغییر دیده نشد، عدد نسخه رو بالا ببر (noys-v2, ...)
const VERSION = 'noys-v1';
const STATIC_CACHE = VERSION + '-static';
const PAGE_CACHE = VERSION + '-pages';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) =>
      c.addAll([OFFLINE_URL, '/assets/fonts/Vazirmatn-RD-Regular.woff2', '/assets/fonts/Vazirmatn-RD-Bold.woff2', '/assets/img/pwa/icon-192.png'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // فقط فایل‌های خود سایت
  if (req.headers.has('range')) return;                       // پخش صوت/ویدیو
  if (/\.(mp3|m4a|mp4|ogg|wav)$/i.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (/\.(css|js|png|jpg|jpeg|webp|svg|woff2?|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
