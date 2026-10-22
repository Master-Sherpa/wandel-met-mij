@echo off
REM Wandel met Mij - Deploy EVERYTHING to Firebase (Hosting + Functions)

echo.
echo ========================================
echo  Deploy ALL to Firebase: fsy-prep
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij"

echo [1/3] Selecting project fsy-prep...
call firebase use fsy-prep

echo.
echo [2/3] Deploying Functions + Hosting...
call firebase deploy

echo.
echo ========================================
echo  DEPLOY COMPLETE!
echo ========================================
echo.
echo Your app is now LIVE at:
echo   https://fsy-prep.web.app
echo   https://fsy-prep.firebaseapp.com
echo.
echo Try sending a code - you'll get a REAL email!
echo.
pause
