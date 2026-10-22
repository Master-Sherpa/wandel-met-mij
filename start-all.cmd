@echo off
REM Wandel met Mij - Start ALL Servers
REM This script starts both the app server and emulator

echo.
echo ========================================
echo  Wandel met Mij - Full Startup
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij"

echo [STEP 1] Starting app server on port 8080...
echo.

REM Start http-server in background
start "Wandel met Mij - App Server" cmd /k "npx http-server --port 8080"

timeout /t 3

echo [STEP 2] Starting Firebase Emulator on port 5001...
echo.

REM Start emulator in background
start "Wandel met Mij - Firebase Emulator" cmd /k "cd functions && npm install && npm run serve"

timeout /t 3

echo.
echo ========================================
echo  BOTH SERVERS STARTING
echo ========================================
echo.
echo App available at:
echo   http://localhost:8080
echo.
echo Firebase Emulator:
echo   http://localhost:4000
echo.
echo Check both terminal windows for status
echo Press any key to close this window
echo.

pause
