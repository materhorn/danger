/* 毒化物緊急應變查詢系統 — Service Worker
   目的：離線可用（火場地下室/廠房常無訊號）。
   策略：stale-while-revalidate — 先給快取(秒開、離線也行)，背景順便更新。
   更新內容後：把下面 CACHE 版本號 +1（例 v1 → v2），使用者下次連線即自動更新。 */
const CACHE = 'tox-emergency-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // 個別檔案失敗(如 './' 在某些主機 404)不應擋住整個安裝
      Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        // 離線且未命中：對頁面導覽請求回傳已快取的主程式
        cached || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
      );
      return cached || network;
    })
  );
});
