/* 冠億業務通 service worker（交接28 → 交接29-5 併回根目錄，scope ./）
 * 只管本站（github.io）自己的外殼：index／manifest／圖示。script.google.com（站3、回報 beacon、離線探測）一律不攔、不快取（登入、資料都直連）。
 * 頁面：網路優先（改版立刻生效），沒網路才用快取；只有入口頁本身（./）會寫進快取，/app/ 轉址頁、404 等其他頁不寫，免得蓋掉外殼。
 * 圖示等靜態檔：快取優先。改外殼時把 V 加一版。
 * 快取名稱一律以 gy-root- 開頭：github.io 同一個網域下的快取是共用的（/app/ 舊版用 gy-app-），只清自己這一系列。 */
var V = 'gy-root-v1';
var SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
var HOME = new URL('./', self.location).pathname;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('gy-root-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (/(^|\.)google\.com$|(^|\.)googleusercontent\.com$/.test(u.hostname)) return;   /* 站3：不攔、不快取 */
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    var home = u.pathname === HOME;
    e.respondWith(fetch(r).then(function (res) {
      if (home && res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put('./', cp); }); }
      return res;
    }).catch(function () { return caches.match('./', { cacheName: V }); }));
    return;
  }
  e.respondWith(caches.match(r, { cacheName: V }).then(function (hit) { return hit || fetch(r); }));
});
