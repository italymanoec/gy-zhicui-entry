/* 【交接29-5】/app/ 舊測試版 service worker 的「自我註銷」版。
 * /app/ 已改成轉址到根目錄；瀏覽器下次在 /app/ 底下連線檢查更新時會裝到這支：
 * 清掉 /app/ 自己的快取（gy-app-*）→ 註銷自己 → 重新載入開著的頁面（轉址頁直接去根目錄）。不攔任何請求。 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('gy-app-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (cs) { cs.forEach(function (c) { try { if (c.navigate) c.navigate(c.url).catch(function () {}); } catch (x) {} }); }));   /* 【交接31】舊 iOS 沒有 navigate：註銷照樣完成，頁面下次開就脫離 */
});
