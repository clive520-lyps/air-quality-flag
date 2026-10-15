@echo off
chcp 65001 >nul
title 校園空氣品質監測與空汙旗幟產生器
echo ========================================================
echo  🏫 正在啟動「校園空氣品質監測與空汙旗幟產生器」...
echo  📡 預設監測區域：臺中市沙鹿區 (沙鹿測站)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 系統未偵測到 Node.js 環境，請先安裝 Node.js！
    pause
    exit /b
)

echo [1/2] 正在啟動本機伺服器 (連接環境部空氣品質監測網)...
start /b node server.js

timeout /t 2 >nul

echo [2/2] 自動於瀏覽器開啟主網頁產生器...
start http://localhost:3000

echo.
echo ========================================================
echo  ✓ 系統已在背景順利執行！
echo  🌐 主網頁 (產生器): http://localhost:3000
echo  🚩 內嵌小工具:     http://localhost:3000/widget.html?site=26
echo ========================================================
echo.
echo 如需停止服務，請直接關閉此視窗或按 Ctrl+C。
node server.js
