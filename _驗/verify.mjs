import { chromium } from '/Users/kuojui-jen/植淬工作區/自動化/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9342');
const results=[];
for(const app of [false,true]) for(const [w,h,font] of [[390,844,0],[360,800,0],[360,800,20]]) for(const after of [false,true]){
 const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'});
 await ctx.route('https://script.google.com/**',r=>r.request().method()==='POST'?r.abort():r.fulfill({body:'<!doctype html><html></html>',contentType:'text/html'}));
 const p=await ctx.newPage(); await p.clock.install();
 const name=`${app?'app':'entry'}-${w}${font?'-20':''}-${after?'after':'before'}`;
 await p.goto(`http://127.0.0.1:8054/${after?'preview-1022-font/':''}${app?'app/':''}index.html?wait=5000`);
 if(font)await p.addStyleTag({content:'*{font-size:20px!important}'});
 await p.clock.runFor(16000);
 if(!await p.locator('#btns').isVisible())throw Error('fallback missing '+name);
 const measure=await p.evaluate(()=>({sizes:[...new Set([...document.querySelectorAll('body *')].map(e=>getComputedStyle(e).fontSize))],overflow:[...document.querySelectorAll('#panel,.card,h1,p,button,a')].filter(e=>e.getBoundingClientRect().width&& (e.scrollWidth>e.clientWidth+1 || e.getBoundingClientRect().right>innerWidth+1)).map(e=>e.id||e.tagName)}));
 if(after&&(measure.sizes.length>5||measure.overflow.length))throw Error(name+JSON.stringify(measure));
 await p.screenshot({path:`_驗/${name}.png`});
 await p.locator('#bRetry').click(); if(await p.locator('#btns').isVisible())throw Error('retry missing');
 await p.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://script.google.com',data:{gy:'booking-ready'}})));
 if(await p.locator('#panel').isVisible())throw Error('ready missing');
 if(app){await p.reload(); await p.evaluate(()=>window.dispatchEvent(new Event('offline')));if(!await p.locator('#msg').textContent().then(t=>t.includes('目前沒有網路')))throw Error('offline missing');await p.screenshot({path:`_驗/${name}-offline.png`});}
 results.push({name,...measure,retry:true,ready:true,offline:app});await ctx.close();
}
fs.writeFileSync('_驗/驗證.json',JSON.stringify(results,null,2));await b.close();
