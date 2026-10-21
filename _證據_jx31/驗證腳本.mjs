// 交接31 驗證腳本：模擬 GitHub Pages（/gy-zhicui-entry/），Chrome --headless=new 模擬 iPhone，script.google.com 用替身。
// 用法：node 驗證腳本.mjs <站台根目錄JSON> <輸出目錄>
//   站台根目錄JSON 例：'{"main":"/path/main","jx29":"/path/jx29","fix":"/path/fix"}'
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');

const SITES = JSON.parse(process.argv[2]);
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const BASE = '/gy-zhicui-entry/';
let root = null;                         // 目前「線上」是哪一版：切換＝模擬 main 被換掉
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (!u.pathname.startsWith(BASE)) { s.writeHead(404); return s.end(); }
  let rel = decodeURIComponent(u.pathname.slice(BASE.length));
  let f = path.join(root, rel);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!u.pathname.endsWith('/')) { s.writeHead(301, { Location: u.pathname + '/' + u.search }); return s.end(); }   // GitHub Pages：/app → /app/
    f = path.join(f, 'index.html');
  }
  // GitHub Pages 實際是 max-age=600；測試用 no-cache 讓「換版」立即可見（真機最多多等 10 分鐘）
  if (!fs.existsSync(f)) { s.writeHead(404, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' }); return s.end(fs.readFileSync(path.join(root, '404.html'))); }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  s.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://localhost:' + srv.address().port;   // localhost＝安全來源，service worker 可用

const exe = fs.readdirSync('/opt/pw-browsers').filter(d => /^chromium-\d+$/.test(d)).map(d => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const browser = await chromium.launch({ executablePath: exe, headless: false, args: ['--headless=new'] });
const VERSION = browser.version();
const iphone = devices['iPhone 13'];

const S3 = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="margin:0;padding:16px;font:16px -apple-system,sans-serif;background:#e8f5e9">
<h2 style="margin:0 0 8px">站3（測試替身）</h2><p>這頁代表 script.google.com 上的站3，已開出來。</p><button id="b" style="font-size:18px;padding:10px 20px" onclick="this.textContent='已點 '+(++n)+' 次'">點我測可操作</button>
<script>var n=0;parent.postMessage({gy:'booking-ready'},'*');</script>`;

async function scenario(name, o) {
  // o: { site, url, favicon: 'ok'|'abort'|'hang', s3Delay, shots: [ms...], pre: async(ctx,page)=>{}, offline, after: async(ctx,page,rec)=>{} }
  const ctx = await browser.newContext({ ...iphone });
  const rec = { 名稱: name, 站台: o.site, 網址: o.url, 情境: { favicon: o.favicon, 站3延遲ms: o.s3Delay }, 站3載入次數: 0, 回報: [], console錯誤: [], 時間軸: [] };
  await ctx.route('https://script.google.com/**', async (rt) => {
    const rq = rt.request(), u = new URL(rq.url());
    if (ctx._down) return rt.abort('internetdisconnected');
    if (u.pathname === '/favicon.ico') {
      if (o.favicon === 'abort') return rt.abort('blockedbyresponse');      // 等同 CORP／被擋：no-cors fetch 直接失敗
      if (o.favicon === 'hang') return;                                     // 一直不回（慢網路／被吊住）
      return rt.fulfill({ status: 200, contentType: 'image/x-icon', body: '' });
    }
    if (ctx._down) return rt.abort('internetdisconnected');
    if (rq.method() === 'POST') { try { rec.回報.push(JSON.parse(rq.postData()).結果); } catch (e) {} return rt.fulfill({ status: 200, body: 'ok' }); }
    if (/\/exec$/.test(u.pathname)) {
      rec.站3載入次數++;
      await new Promise(r => setTimeout(r, o.s3Delay || 0));
      return rt.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: S3 });
    }
    return rt.fulfill({ status: 404, body: '' });
  });
  if (o.pingHang) await ctx.route(/manifest\.webmanifest\?ping=/, () => {});   // 本站探測一直不回（慢網路）
  const page = await ctx.newPage();
  const onErr = (t) => rec.console錯誤.push(t);
  page.on('console', m => { if (m.type() === 'error') onErr('[console] ' + m.text()); });
  page.on('pageerror', e => onErr('[pageerror] ' + e.message));
  if (o.pre) await o.pre(ctx, page, rec);
  root = SITES[o.site];
  const t0 = Date.now();
  await page.goto(ORIGIN + o.url, { waitUntil: 'commit' });
  for (const ms of o.shots) {
    await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
    const 實際 = ((Date.now() - t0) / 1000).toFixed(1);
    const st = await state(page);
    const f = `${name}_${String(ms / 1000).replace('.', '點')}s.png`;
    // 用 CDP 直接擷取畫面：Playwright 的 page.screenshot 會等框（站3）載完，抓不到「載入中」那一刻
    const cdp = await ctx.newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, f), Buffer.from(data, 'base64')); await cdp.detach();
    rec.時間軸.push({ 秒: ms / 1000, 實際秒: Number(實際), 截圖完成秒: Number(((Date.now() - t0) / 1000).toFixed(1)), ...st, 截圖: f });
  }
  if (o.after) await o.after(ctx, page, rec);
  rec.SW = await swState(page);
  rec.最後網址 = page.url().replace(ORIGIN, '');
  await ctx.close();
  return rec;
}
async function state(page) {
  try {
    return await page.evaluate(() => {
      const p = document.getElementById('panel'), m = document.getElementById('msg'), l = document.getElementById('loading');
      return {
        網址: location.pathname + location.search,
        提示面板: p ? (p.hidden ? '收起' : '顯示：' + (m ? m.textContent : '')) : '（無面板）',
        載入中字樣: l ? (l.hidden ? '隱藏' : getComputedStyle(l).opacity === '0' ? '尚未浮出' : '顯示') : '（無）',
        // 點「載入中…」字樣正中央，最上層的元素是誰：不是它自己＝點擊穿透、不擋操作
        載入中點擊穿透: l && !l.hidden ? (() => { const b = l.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e === l ? '否（被字樣擋住）' : '是（點到 ' + e.tagName + (e.id ? '#' + e.id : '') + '）'; })() : undefined
      };
    });
  } catch (e) { return { 錯誤: String(e.message).slice(0, 80) }; }
}
async function swState(page) {
  try {
    return await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return '不支援';
      const rs = await navigator.serviceWorker.getRegistrations();
      return {
        註冊: rs.map(r => ({ scope: r.scope.replace(location.origin, ''), script: (r.active || r.waiting || r.installing || {}).scriptURL?.replace(location.origin, ''), 狀態: (r.active || r.waiting || r.installing || {}).state })),
        本頁受控: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.replace(location.origin, '') : '否',
        快取: await caches.keys()
      };
    });
  } catch (e) { return '讀不到：' + e.message; }
}
// 站3 開出來後，點得到嗎（替身按鈕在 iframe 裡）
async function clickable(page, rec) {
  const f = page.frames().find(fr => /script\.google\.com/.test(fr.url()));
  if (!f) { rec.可操作 = '找不到站3框'; return; }
  const box = await page.locator('iframe#app').boundingBox();
  const top = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + (e.id ? '#' + e.id : '') : null; }, [box.x + 60, box.y + 120]);
  rec.點擊位置最上層元素 = top;
  try { await f.click('#b', { timeout: 2000 }); rec.可操作 = await f.textContent('#b'); } catch (e) { rec.可操作 = '點不到：' + e.message.split('\n')[0]; }
}

const PLAN = JSON.parse(process.env.PLAN || '[]');
const results = [];
for (const p of PLAN) {
  const o = { ...p };
  if (p.click) o.after = async (ctx, page, rec) => clickable(page, rec);
  if (p.installOld) o.pre = async (ctx, page, rec) => {           // 先用舊版裝好 SW，再換新版
    root = SITES[p.installOld.site];
    await page.goto(ORIGIN + p.installOld.url); await page.waitForTimeout(4000);
    rec.換版前SW = await swState(page);
    await page.goto('about:blank');
  };
  if (p.offlineAfterInstall) o.pre = async (ctx, page, rec) => {
    root = SITES[p.site];
    await page.goto(ORIGIN + p.url); await page.waitForTimeout(4000);
    rec.斷網前SW = await swState(page);
    await ctx.setOffline(true); ctx._down = true;
    setTimeout(() => { ctx._down = false; ctx.setOffline(false).then(() => rec.恢復網路秒 = p.reconnectAt / 1000); }, p.reconnectAt);
  };
  if (p.fcp) o.after = async (ctx, page, rec) => {
    rec.首次繪製ms = await page.evaluate(() => { const e = performance.getEntriesByName('first-contentful-paint')[0]; return e ? Math.round(e.startTime) : null; });
    if (p.click) await clickable(page, rec);
  };
  const r = await scenario(p.name, o);
  results.push(r);
  console.log(JSON.stringify(r));
}
fs.writeFileSync(path.join(OUT, '結果.json'), JSON.stringify({ 瀏覽器: 'Chrome ' + VERSION + '（--headless=new）', 模擬裝置: 'iPhone 13（UA：' + iphone.userAgent + '，' + iphone.viewport.width + '×' + iphone.viewport.height + '）', 時間: new Date().toISOString(), 結果: results }, null, 2));
await browser.close(); srv.close();
