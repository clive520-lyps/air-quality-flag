# 🏫 臺灣校園空氣品質旗幟與室外課監測小工具 (Taiwan School Air Quality Flag & Outdoor PE Widget)

![Air Quality Flag Widget](https://img.shields.io/badge/Status-Live%20Ready-brightgreen)
![GitHub Actions](https://img.shields.io/badge/Auto%20Update-Every%2020%20Mins-blue)
![License](https://img.shields.io/badge/License-MIT-orange)

專為臺灣國小、國中、高中及幼兒園打造的**即時校園空氣品質指標旗幟、當地天氣與室外體育課判定看板**。

可獨立使用，亦提供產生器快速複製語法，一鍵嵌入校園官網、電子看板、班級網頁或穿堂大螢幕。

---

## 🌟 核心特色

1. **🚩 教育部標準六色空品旗幟（波浪動態展示）**
   - 依照環境部 AQI 即時指標，動態轉換綠色旗（良好）、黃色旗（普通）、橘色旗（對敏感族群不健康）、紅色旗（對所有族群不健康）、紫色旗（非常不健康）與褐紅旗（危害）。
   - 旗幟布面具備流暢微風飄動特效。

2. **☀️ 當地即時氣象與溫度聯動**
   - 整合即時氣象服務，旗幟旁懸浮展示測站當地氣溫（如 28°C）與天氣圖示（☀️晴朗、⛅多雲、🌧️降雨等）。

3. **🏃‍♂️ 校園室外體育課與大下課活動智慧判定**
   - 依據「教育部高級中等以下學校因應空品惡化處理措施」，即時顯示活動建議：
     - 適合室外課 / 可正常室外課 / 宜減少劇烈運動 / 建議改室內課 / 停止戶外活動 / 嚴禁戶外活動。
   - 提供一般體育課調適建議與氣喘過敏敏感學童專屬照護叮嚀。

4. **📊 各項空污數據方塊**
   - 提供 AQI、PM2.5、PM10、臭氧 O₃ 等即時數值，可自由開啟或關閉。

5. **⚙️ 模組化產生器門戶 (`index.html`)**
   - 支援臺灣全臺 22 縣市、84 個監測站快速切換。
   - 寬度支援百分比（如 `100%` 滿版、`75%`、`50%`）與像素（`390px`）。
   - 提供標準卡片、精簡側邊欄、橫幅橫條與迷你徽章等多種主題版型。
   - 支援校園演練模擬模式（綠、黃、橘、紅、紫、褐紅即時測試）。

6. **☁️ GitHub Pages 零主機費用自動更新**
   - 內建 GitHub Actions 每 20 分鐘自動排程更新最新空品與氣象快照至 `data/`。
   - 完全靜態託管於 GitHub Pages，無需自行架設伺服器。

---

## 💻 快速內嵌範例 (Embed Code)

### 標準響應式 Iframe 嵌入碼 (推薦)
```html
<iframe src="https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/widget.html?site=26" 
        width="100%" 
        height="330" 
        frameborder="0" 
        scrolling="no" 
        style="border:none; overflow:hidden; border-radius:24px; max-width:420px; box-shadow:0 8px 24px rgba(0,0,0,0.08);" 
        title="校園空氣品質旗幟與室外課監測">
</iframe>
```

### 常見參數說明 (`widget.html`)
- `site`：測站代碼（預設 `26` 為臺中沙鹿測站，豐原為 `74`，西屯為 `25` 等）。
- `theme`：版型樣式（`card` 標準卡片、`compact` 側邊欄、`banner` 橫幅、`badge` 迷你徽章）。
- `show_station`：是否顯示測站與地點選單（`1` 或 `0`）。
- `show_flag`：是否顯示旗幟（`1` 或 `0`）。
- `show_weather`：是否顯示天氣與溫度（`1` 或 `0`）。
- `show_decision`：是否顯示室外課判定大徽章（`1` 或 `0`）。
- `show_activity`：是否顯示體育課建議卡片（`1` 或 `0`）。
- `show_sensitive`：是否顯示敏感學童照護卡片（`1` 或 `0`）。
- `show_metrics`：是否顯示各項空污指標方塊（`1` 或 `0`）。

---

## 🛠️ 本機開發與執行

```bash
# 1. 下載依賴 (專案使用原生 Node.js，無額外依賴)
node server.js

# 2. 開啟瀏覽器訪問產生器
# http://localhost:3000
```

---

## 📄 資料來源
- 空氣品質數據：中華民國環境部空氣品質監測網 (airtw.moenv.gov.tw)
- 氣象資料：Open-Meteo Weather API
- 學校應變指引：教育部高級中等以下學校因應空氣品質惡化處理措施作業流程
