# 交件 jx32c：app/ 開站3 時帶 src=app

分支：`claude/jx32-app-src-pb9n91`（從 `origin/claude/jx32-app-src` 6798938 快轉，含行政部的任務書 commit；其下即 origin/main 7922895）。
程式碼只動 `app/index.html`。根目錄 `index.html`、`manifest.webmanifest`、`404.html`、圖示、`app/sw.js`、`app/manifest.webmanifest` 逐位元與 origin/main 相同。
交件檔與截圖放在 `_證據_jx32c/`，根目錄沒有新增或修改任何檔案（任務書檔是行政部原本的 commit）。

## 改了什麼（app/index.html）

ROUTES 三條站3 網址結尾由 `/exec?` 改成 `/exec?src=app&`，加一行註解：

| 路 | 改前 | 改後 |
|---|---|---|
| 不帶登入 | `…/macros/s/<ID>/exec?` | `…/macros/s/<ID>/exec?src=app&` |
| 主入口 | `…/macros/s/<ID>/exec?` | `…/macros/s/<ID>/exec?src=app&` |
| 備用路徑 | `…/a/macros/gmail.com/s/<ID>/exec?` | `…/a/macros/gmail.com/s/<ID>/exec?src=app&` |

- 程式裡沒有任何地方在網址後面再接參數（`app.src = ROUTES[i].url`、兩顆按鈕 href 都直接用），所以結果就是 `exec?src=app&`；結尾保留 `&`，和原本保留 `?` 一樣是方便日後再接參數。結尾多一個 `&` 對 GAS `e.parameter` 沒影響（只會解出 `src`）。
- 兩顆按鈕「在新分頁開主入口」「備用路徑」吃同一個 ROUTES，也跟著帶 `src=app`。
- 回報 BEACON（POST 到 `/exec`）沒動。

## 驗證結果

本機 `python3 -m http.server` 模擬 GitHub Pages 路徑；Chromium `--headless=new`（Playwright 驅動）。雲端連不到 script.google.com，一律用本機替身攔截：
- 「已更新版」替身：看到 `src=app` 時頁首顯示「冠億業務通」（模擬交接32b 完成後的站3）；
- 「未更新版」替身：不認參數，照舊顯示「冠億199案 買賣預約單」（模擬現在的站3）；
- 「沒開出來」：回 503。
替身只用於測試，不是站3 真實畫面。腳本：`_證據_jx32c/驗證腳本_verify.js`。

```
✅ 三條路依序打出 3 個站3 網址　3
✅ 路 1 帶 src=app　/macros/s/<ID>/exec?src=app&
✅ 路 2 帶 src=app　/macros/s/<ID>/exec?src=app&
✅ 路 3 帶 src=app　/a/macros/gmail.com/s/<ID>/exec?src=app&
✅ 路 1、2 為 /macros/s/…/exec，路 3 為 /a/macros/gmail.com/s/…/exec
✅ 「在新分頁開主入口」按鈕帶 src=app
✅ 「備用路徑」按鈕帶 src=app
✅ 網址沒有 ?? 或 && 等錯誤拼接
✅ console 無錯（替身故意回的 503 除外）
✅ 站3 未更新版：照常開出來（booking-ready、面板收掉）　頁首＝冠億199案 買賣預約單
✅ 站3 未更新版：console 無錯
✅ 站3 已更新版（替身）：頁首顯示「冠億業務通」
✅ ?probe= 演練仍換第一條路且帶 src=app
✅ 無橫向溢出（3 種狀態 × 390x844、360x800、390x844 字 20px，共 9 項）
全部通過
```

結論：站3 沒更新前多帶 `src=app` 不影響運作（照常開出來、照常送 booking-ready）；站3 更新後就會看到參數。

## 截圖（命名：app_狀態_尺寸_前/後.png；前＝origin/main，後＝本分支）

| 狀態 | 390x844 | 360x800 | 390x844 字 20px |
|---|---|---|---|
| 站3開出來後_替身已更新 | 前／後 | 前／後 | 前／後 |
| 站3開出來後_替身未更新 | 前／後 | 前／後 | 前／後 |
| 三條路都沒開出來 | 前／後 | 前／後 | 前／後 |

「替身已更新」那組：前（不帶 src）頁首是舊標題，後（帶 src=app）頁首是「冠億業務通」——這就是本次改動的效果。外殼按鈕面板前後無差異。

「字 20px」＝根字級設 20px 模擬手機放大字。

## 尚未做

- 真站3 實測（雲端連不到 GAS）；交接32b 上線後請行政部在手機上從 `/app/` 打開，確認頁首變「冠億業務通」。
- 真機（iPhone／Android）實測。
- `app/sw.js` 對頁面是「網路優先」，已安裝的 App 有網路時打開就會拿到新的 `app/index.html`，sw 不用改版號（GitHub Pages 本身可能快取約 10 分鐘）。
