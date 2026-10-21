# 冠億業務通 PWA：切換與回滾（交接29-5）

> 狀態：**只準備、未上線**。main 沒有動，仍是 `c796989`。所有改動都在分支 `claude/jx29-pwa-root`。

## 0. 這個分支改了什麼

| 檔案 | 改動 |
|---|---|
| `index.html` | 換成 /app/ 版（冠億業務通、離線提示＋自動重試）；開頁回報頁名 `冠億業務通(測試)` → `冠億業務通`；`register('sw.js', { scope: './' })` |
| `manifest.webmanifest`、4 個圖示 | 換成 /app/ 版（冠億 logo、名稱「冠億業務通」、`id ./`、`scope ./`、`start_url ./?src=pwa`） |
| `sw.js`（新） | 根目錄 service worker，scope `./`。只快取外殼（入口頁、manifest、圖示），快取名一律 `gy-root-*`。**script.google.com／googleusercontent.com 一律不攔、不快取**。頁面網路優先；只有入口頁本身寫進快取（/app/ 轉址頁、404 不會蓋掉外殼） |
| `app/index.html` | 改成轉址頁：`/app/?…` → `/?…`（網址參數、#原樣帶過去）；manifest／圖示保留，舊的「加入主畫面」捷徑照樣能開 |
| `app/sw.js` | 換成**自我註銷版**：已裝過 /app/ 測試版的手機，下次連線時自動清掉 `gy-app-*` 快取並註銷，之後由根目錄 SW 接手 |
| `rollback/sw.js`（新） | 回滾專用的根目錄自我註銷 SW，平常不會被註冊，回滾時才複製成根目錄 `sw.js` |
| `404.html` | 不動 |

回滾點 tag：`pre-pwa-root-20261021` → `c796989`（PWA 併根目錄前的 main）。

> ⚠️ 這次在雲端環境裡 **tag 推不上去**（git 代理只放行工作分支，推 tag 一律被斷線），tag 只建在本機。請在自己電腦上補推一次：
>
> ```bash
> git fetch origin
> git tag -a pre-pwa-root-20261021 c796989 -m "PWA 併根目錄前的 main（回滾點）"
> git push origin pre-pwa-root-20261021
> ```
>
> 下面所有回滾指令在 tag 不存在時，把 `pre-pwa-root-20261021` 換成 `c796989` 一樣能用。

## 1. 上線（把分支併進 main）

在自己電腦上（不開 PR 的直接做法）：

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git log -1 --format=%h          # 應為 c796989；若不是，代表 main 之後有新提交，先看清楚再併
git merge --no-ff origin/claude/jx29-pwa-root -m "上線：PWA 冠億業務通併回根目錄（交接29-5）"
git push origin main
git log -1 --format=%H          # 記下這個 merge commit，回滾 A 要用
```

用 `--no-ff` 是為了留下**一個** merge commit，回滾時一行 `git revert -m 1` 就能整包退。

GitHub Pages 約 1–2 分鐘生效。上線後檢查：
1. 開 `https://italymanoec.github.io/gy-zhicui-entry/` → 標題「冠億業務通」、站3 開得出來。
2. 開 `https://italymanoec.github.io/gy-zhicui-entry/app/` → 自動跳回根目錄。
3. 手機飛航模式下從主畫面打開 → 顯示「目前沒有網路。連上網路後會自動開啟。」，關掉飛航模式後自動開出站3。
4. Apps Script 執行項目裡的回報，`頁` 欄應是「冠億業務通」（不再有「(測試)」）。

## 2. 回滾

兩種做法擇一。**兩種都一定要放「自我註銷 sw.js」**：已經裝過根目錄 service worker 的手機，如果 sw.js 只是消失（404），瀏覽器**不會**自動註銷，SW 會一直留著；換成自我註銷版，瀏覽器下次連線檢查更新時就會裝到它、自己拆掉。

### 回滾 A（建議）：git revert，不改寫歷史

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert -m 1 <上線時記下的 merge commit> --no-edit
# 放回自我註銷 sw.js（revert 會把 sw.js、rollback/ 一起刪掉，這裡從分支取回來）
git show origin/claude/jx29-pwa-root:rollback/sw.js > sw.js
git add sw.js
git commit -m "回滾：PWA 根目錄入口頁；根目錄 sw.js 換成自我註銷版"
git push origin main
```

找不到 merge commit 時：`git log --merges --oneline -5 main`，訊息是「上線：PWA 冠億業務通併回根目錄」那一筆。

### 回滾 B：main 重設回 tag（會改寫 main 歷史，需強推）

只有在 A 走不通（例如上線後又疊了很多亂掉的提交）才用：

```bash
git fetch origin --tags
git checkout main
git reset --hard pre-pwa-root-20261021        # 或 c796989
git show origin/claude/jx29-pwa-root:rollback/sw.js > sw.js
git add sw.js
git commit -m "回滾：main 重設回 pre-pwa-root-20261021；根目錄 sw.js 換成自我註銷版"
git push --force-with-lease origin main
```

若 main 有開分支保護、禁止強推，就用回滾 A。

### 回滾後，已裝 service worker 的手機怎麼自動解除

- 根目錄 SW 對頁面是**網路優先**：回滾一推上去，手機只要有網路，開頁拿到的就是回滾後的舊入口頁（「冠億199案 買賣預約單」），不會卡在新版。
- 同一次開頁，瀏覽器會去比對 `sw.js`（SW 腳本本身不吃 HTTP 快取；GitHub Pages 最多再多 10 分鐘），發現換成自我註銷版 → 安裝 → 清掉 `gy-root-*` 快取 → `registration.unregister()` → 把開著的頁面重新載入一次。之後這台手機就完全沒有 service worker，跟上線前一樣。
- 使用者不用做任何事；唯一條件是「回滾後至少連網開過一次」。
- **自我註銷的 `sw.js` 回滾後要一直留著**（它不攔任何請求，留著無害）；刪掉它，還沒開過的手機就解不掉。
- 回滾 A／B 都會把 /app/ 還原成原本的測試版（含它自己的 `gy-app-*` SW），等於回到 c796989 的狀態，不需另外處理。

## 3. 驗證結果（2026-10-21，雲端環境實跑）

方法：node 自寫靜態伺服器模擬 GitHub Pages（路徑 `/gy-zhicui-entry/`，找不到的檔案回 `404.html`），用 Playwright 驅動 **Chrome 141.0.7390.37 `--headless=new`**。script.google.com 以攔截模擬（`/exec` 回一頁會送 `booking-ready` 的假站3，favicon 回 200；「斷線」時一律回網路錯誤）。另外拿 main（c796989）的檔案模擬「舊 /app/ 測試版已安裝」，拿「c796989＋rollback/sw.js」模擬回滾後的線上狀態。

| # | 項目 | 結果 | 實測值 |
|---|---|---|---|
| 1 | manifest 可解析 | ✅ | name=冠億業務通、start_url=./?src=pwa、scope=./、id=./、display=standalone |
| 2 | manifest 三個圖示 | ✅ | icon-192（any）、icon-512（any）、icon-maskable-512（maskable）皆 200、image/png |
| 3 | 上線開頁，站3 框開出 | ✅ | 收到 booking-ready，提示面板收起；title=冠億業務通 |
| 4 | SW 註冊成功 | ✅ | scope=`…/gy-zhicui-entry/`、script=`…/gy-zhicui-entry/sw.js`、state=activated |
| 5 | 外殼進快取 | ✅ | `gy-root-v1`：入口頁、manifest、4 個圖示，共 6 筆 |
| 6 | script.google.com 不經 SW | ✅ | google 請求 6 筆，經 SW 0 筆 |
| 7 | 回報頁名 | ✅ | `頁: '冠億業務通'`，頁面原始碼無「(測試)」 |
| 8 | **離線顯示提示** | ✅ | 斷網重整：外殼由 SW 給出，顯示「目前沒有網路。連上網路後會自動開啟。」 |
| 9 | 離線開 /app/ | ✅ | 轉回根目錄外殼，同樣顯示離線提示 |
| 10 | 恢復網路自動開出 | ✅ | 恢復後 5 秒內自動重開，站3 框開出 |
| 11 | 快取的外殼沒被蓋掉 | ✅ | 開過 /app/ 轉址頁後，快取裡的 `./` 仍是入口頁 |
| 12 | /app/ 轉址（參數保留） | ✅ | `/app/?src=pwa&wait=12000#x` → `/?src=pwa&wait=12000#x` |
| 13 | 舊 /app/ 測試版 SW 自我註銷 | ✅ | 先裝 c796989 的 /app/ SW，再換新版開 /app/：/app/ 註冊消失、`gy-app-v1` 快取清掉，只剩根目錄 SW |
| 14 | 回滾後 SW 自動解除 | ✅ | 換成「c796989＋自我註銷 sw.js」後開根目錄：註冊 0、快取 0、頁面不受 SW 控制、title 回到「冠億199案 買賣預約單」 |

全部 14 項通過（腳本結束碼 0）。

**沒驗到、要上線後手機實測的：** 真正的 GitHub Pages（HTTPS、CDN 快取）、iPhone Safari／LINE 內建瀏覽器的 SW 行為、Android 已安裝的 /app/ WebAPK 捷徑點開後跳到根目錄的樣子（跳出捷徑 scope，Android 可能在頂端多一條網址列，但能正常使用；重新「加入主畫面」一次即可拿到根目錄版捷徑）、真正站3 的開頁與回報。
