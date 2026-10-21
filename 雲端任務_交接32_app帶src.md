# 雲端任務 交接32c：app/ 開站3 時帶 src=app（行政部 19:50，21:00 截止）
只改 app/index.html：ROUTES 三條站3 網址都加 `src=app` 參數（現為 .../exec? 結尾，接成 exec?src=app&...，確認後續參數拼接正確）。根目錄 index.html、manifest、sw 一律不動。
用途：站3（另一場 交接32b）看到 src=app 時頁首顯示「冠億業務通」；站3 沒更新前多帶參數不影響運作，請驗證。
headless --headless=new 390x844/360x800/20px 截圖、無橫向溢出。交件_jx32c.md＋PR base main，不合併。不 force、不刪檔、不印密鑰。
