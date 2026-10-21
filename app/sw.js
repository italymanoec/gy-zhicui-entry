/* 冠億業務通 service worker（交接28）
 * 只管本站（github.io）自己的外殼：index／manifest／圖示。script.google.com 的站3 一律不攔、不快取（登入、資料都直連）。
 * 頁面：網路優先（改版立刻生效），沒網路才用快取；圖示等靜態檔：快取優先。改外殼時把 V 加一版。 */
var V = 'gy-app-v1';
var SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) {
      var cp = res.clone(); caches.open(V).then(function (c) { c.put('./', cp); }); return res;
    }).catch(function () { return caches.match('./'); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (hit) { return hit || fetch(r); }));
});
