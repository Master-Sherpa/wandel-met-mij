@echo off
REM Wandel met Mij - Deploy Functions naar Firebase (fsy-prep)
REM De Resend API-sleutel staat NIET in dit script; die staat als secret in Firebase.

echo.
echo ========================================
echo  Deploy Functions: fsy-prep
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij\functions"

echo [1/3] Dependencies installeren...
call npm install
if %errorlevel% neq 0 (
    echo FAILED! Check errors above.
    pause
    exit /b 1
)

echo.
echo [2/3] Project selecteren...
cd /d "C:\dev\apps\wandel-met-mij"
call firebase use fsy-prep

echo.
echo [3/3] Functions deployen...
call firebase deploy --only functions --project fsy-prep

echo.
echo ========================================
echo  DEPLOYMENT COMPLETE!
echo ========================================
pause
