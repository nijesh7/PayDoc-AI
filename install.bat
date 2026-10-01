@echo off
title PayDoc AI — Dependencies Installer
color 0A

echo ============================================================================
echo               PAYDOC AI — INSTALLING ALL DEPENDENCIES
echo ============================================================================
echo.
echo [1/2] Installing Backend Dependencies (Express, Supabase, AI, PDF)...
cd /d "%~dp0backend"
call npm install

echo.
echo [2/2] Installing Frontend Dependencies (Next.js, Tailwind, Recharts, Lucide)...
cd /d "%~dp0frontend"
call npm install

echo.
echo ============================================================================
echo [SUCCESS] All dependencies have been installed successfully!
echo You can now double-click 'start.bat' to launch PayDoc AI.
echo ============================================================================
echo.
pause
