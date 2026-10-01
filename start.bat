@echo off
title PayDoc AI — Launch System
color 0B

echo ============================================================================
echo                      PAYDOC AI — SAAS PLATFORM
echo ============================================================================
echo.
echo [1/3] Checking dependencies...

if not exist "%~dp0backend\node_modules\" (
    echo [!] Backend node_modules not found. Installing backend dependencies...
    start /wait cmd /c "cd /d %~dp0backend && npm install"
)

if not exist "%~dp0frontend\node_modules\" (
    echo [!] Frontend node_modules not found. Installing frontend dependencies...
    start /wait cmd /c "cd /d %~dp0frontend && npm install"
)

echo.
echo [2/3] Starting Express.js Backend API (Port 5000)...
start "PayDoc AI — Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo [3/3] Starting Next.js Frontend Application (Port 3000)...
start "PayDoc AI — Next.js Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================================
echo   PayDoc AI is launching!
echo   - Backend API: http://localhost:5000
echo   - Frontend App: http://localhost:3000
echo ============================================================================
echo.
echo Opening PayDoc AI in your default browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:3000

echo Done! Leave the command windows open while using PayDoc AI.
pause
