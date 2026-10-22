@echo off
REM Wandel met Mij - Firebase Emulator Restart Script
REM Dubbelklik deze file om emulator opnieuw te starten

echo.
echo ========================================
echo  Wandel met Mij - Emulator Restart
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij\functions"

echo [1/3] Stopping any running emulator...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2

echo [2/3] Installing dependencies...
call npm install

echo.
echo [3/3] Starting emulator...
echo.
echo Emulator starting... When ready, visit:
echo   http://localhost:8080
echo.
echo Press Ctrl+C to stop the emulator
echo.

call npm run serve

pause
