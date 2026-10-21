const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const OUT = '/home/user/gy-zhicui-entry/_證據_jx32c';
const AFTER = 'http://127.0.0.1:8781/gy-zhicui-entry/app/';
const BEFORE = 'http://127.0.0.1:8782/gy-zhicui-entry/app/';
const results = [];
const ok = (name, cond, note = '') => results.push(`${cond ? '✅' : '❌'} ${name}${note ? '　' + note : ''}`);

// 替身站3：mode = 'new'（看 src=app 換頁首）/ 'old'（不認參數，照舊）/ 'fail'（503）
function stub(mode, log) {
  return async route => {
    const req = route.request();
    if (req.method() === 'POST') return route.fulfill({ status: 200, body: '' });
    const u = new URL(req.url());
    log.push(u.href);
    if (mode === 'fail' || u.pathname.endsWith('favicon.ico')) return route.fulfill({ status: 503, body: 'x' });
    const src = u.searchParams.get('src');
    const title = mode === 'new' && src === 'app' ? '冠億業務通' : '冠億199案 買賣預約單';
    const body = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<body style="margin:0;font-family:sans-serif"><header style="background:#1b3a5c;color:#fff;padding:12px 16px;font-size:1.1em;font-weight:700" id=h>${title}</header>
<p style="padding:16px">模擬站3頁面（替身，${mode === 'new' ? '已更新版' : '未更新版'}）<br>收到參數：<code id=q>${u.search || '(無)'}</code></p>
<script>parent.postMessage({gy:'booking-ready'},'*')</script>`;
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
  };
}

async function page(browser, base, vp, mode, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const log = [], errs = [];
  await ctx.route(/script\.google\.com/, stub(mode, log));
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  if (opts.font) await p.addInitScript(f => { document.documentElement && (document.documentElement.style.fontSize = f); addEventListener('DOMContentLoaded', () => document.documentElement.style.fontSize = f); }, opts.font);
  await p.goto(base + (opts.qs || ''));
  return { ctx, p, log, errs };
}

async function noOverflow(p) {
  return p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--headless=new'] });
  const sizes = [{ w: 390, h: 844, font: null, tag: '390x844' }, { w: 360, h: 800, font: null, tag: '360x800' }, { w: 390, h: 844, font: '20px', tag: '390x844_字20px' }];

  // 1) 網址驗證：三條路都帶 src=app、參數拼接正確
  {
    const { ctx, p, log, errs } = await page(browser, AFTER, { width: 390, height: 844 }, 'fail', { qs: '?wait=5000' });
    await p.waitForFunction(() => !document.getElementById('btns').hidden, null, { timeout: 30000 });
    const frames = log.filter(u => !u.endsWith('favicon.ico'));
    ok('三條路依序打出 3 個站3 網址', frames.length === 3, String(frames.length));
    frames.forEach((u, i) => {
      const q = new URL(u).searchParams;
      ok(`路 ${i + 1} 帶 src=app`, q.get('src') === 'app' && [...q.keys()].join(',') === 'src', new URL(u).pathname + new URL(u).search);
    });
    ok('路 1、2 為 /macros/s/…/exec，路 3 為 /a/macros/gmail.com/s/…/exec',
      /\/macros\/s\/[^/]+\/exec$/.test(new URL(frames[0]).pathname) && /^\/macros\/s\//.test(new URL(frames[1]).pathname) && /^\/a\/macros\/gmail\.com\/s\/[^/]+\/exec$/.test(new URL(frames[2]).pathname));
    const hrefs = await p.evaluate(() => [document.getElementById('bTab').href, document.getElementById('bAlt').href]);
    ok('「在新分頁開主入口」按鈕帶 src=app', new URL(hrefs[0]).searchParams.get('src') === 'app');
    ok('「備用路徑」按鈕帶 src=app', new URL(hrefs[1]).searchParams.get('src') === 'app');
    ok('網址沒有 ?? 或 && 等錯誤拼接', frames.concat(hrefs).every(u => !/\?\?|&&|\?&/.test(u)));
    ok('console 無錯（替身故意回的 503 除外）', errs.filter(e => !/status of 503/.test(e)).length === 0);
    await ctx.close();
  }
  // 2) 站3 未更新（不認 src）照常開出來
  {
    const { ctx, p, errs } = await page(browser, AFTER, { width: 390, height: 844 }, 'old');
    await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 15000 });
    const h = await p.frameLocator('#app').locator('#h').textContent();
    ok('站3 未更新版：照常開出來（booking-ready、面板收掉）', true, '頁首＝' + h);
    ok('站3 未更新版：console 無錯', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // 3) 站3 已更新：頁首換「冠億業務通」
  {
    const { ctx, p } = await page(browser, AFTER, { width: 390, height: 844 }, 'new');
    await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 15000 });
    const h = await p.frameLocator('#app').locator('#h').textContent();
    ok('站3 已更新版（替身）：頁首顯示「冠億業務通」', h === '冠億業務通', h);
    await ctx.close();
  }
  // 4) 演練參數 ?probe= 仍可用、仍帶 src=app
  {
    const pid = 'AKfycbyGwGEWvWezHcFOzGWXQ7m6-TrlqcvmgC8aEkNwJTbqnoD-X5Hkcriz4oDZRfESA-yBZQ';
    const { ctx, p, log } = await page(browser, AFTER, { width: 390, height: 844 }, 'old', { qs: '?probe=' + pid });
    await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 15000 });
    const u = new URL(log.find(x => !x.endsWith('favicon.ico')));
    ok('?probe= 演練仍換第一條路且帶 src=app', u.pathname.includes(pid) && u.searchParams.get('src') === 'app');
    await ctx.close();
  }

  // 5) 截圖：前（origin/main）／後（本分支），三種尺寸
  const shots = [
    { name: '站3開出來後_替身已更新', mode: 'new', wait: p => p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 15000 }) },
    { name: '站3開出來後_替身未更新', mode: 'old', wait: p => p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 15000 }) },
    { name: '三條路都沒開出來', mode: 'fail', qs: '?wait=5000', wait: p => p.waitForFunction(() => !document.getElementById('btns').hidden, null, { timeout: 30000 }) },
  ];
  for (const s of sizes) for (const sh of shots) for (const [label, base] of [['前', BEFORE], ['後', AFTER]]) {
    const { ctx, p } = await page(browser, base, { width: s.w, height: s.h }, sh.mode, { qs: sh.qs || '', font: s.font });
    await sh.wait(p); await p.waitForTimeout(400);
    const f = `app_${sh.name}_${s.tag}_${label}.png`;
    await p.screenshot({ path: path.join(OUT, f) });
    if (label === '後') ok(`無橫向溢出 ${sh.name} ${s.tag}`, await noOverflow(p));
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('✅')) ? '全部通過' : '有失敗');
})();
