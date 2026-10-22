@echo off
REM Wandel met Mij - Cleanup and Start ALL Servers
REM Kill any existing processes first

echo.
echo ========================================
echo  Cleaning up old processes...
echo ========================================
echo.

REM Kill any node processes on ports 8080 and 5001
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM http-server.exe /T 2>nul

timeout /t 2

echo Cleanup complete. Starting servers...
timeout /t 1

cd /d "C:\dev\apps\wandel-met-mij"

echo.
echo [STEP 1] Starting app server on port 8080...
echo.

REM Start http-server in background
start "WMM App Server" cmd /k "npx http-server --port 8080"

timeout /t 3

echo [STEP 2] Starting Firebase Emulator on port 5001...
echo.

REM Start emulator in background
start "WMM Firebase Emulator" cmd /k "cd functions && npm install && npm run serve"

timeout /t 3

echo.
echo ========================================
echo  SERVERS STARTED
echo ========================================
echo.
echo App: http://localhost:8080
echo Emulator UI: http://localhost:4000
echo.
echo Check both terminal windows
echo Press any key to close
echo.

pause
