@echo off
REM Wandel met Mij - App Server (http-server)
REM Dubbelklik deze file om de app te starten op http://localhost:8080

echo.
echo ========================================
echo  Wandel met Mij - App Server
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij"

echo Starting app server on port 8080...
echo.
echo App available at:
echo   http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

npx http-server

pause
