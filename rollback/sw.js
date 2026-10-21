/* 【交接29-5】回滾用：根目錄 service worker 的「自我註銷」版。平常不用，只有 PWA 回滾時才複製成根目錄的 sw.js（見 切換與回滾_PWA.md）。
 * 已裝過根目錄 service worker 的手機，下次連線時瀏覽器會比對到這支新的 sw.js：
 * 清掉根目錄的快取（gy-root-*）→ 註銷自己 → 重新載入開著的頁面，回到沒有 service worker 的舊入口頁。不攔任何請求。 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('gy-root-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (cs) { cs.forEach(function (c) { try { if (c.navigate) c.navigate(c.url).catch(function () {}); } catch (x) {} }); }));   /* 【交接31】舊 iOS 沒有 navigate：註銷照樣完成，頁面下次開就脫離 */
});
