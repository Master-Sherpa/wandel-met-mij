@echo off
REM Wandel met Mij - Resend API-sleutel als Firebase secret zetten, daarna functions deployen
REM Je wordt gevraagd de sleutel te plakken. Die wordt NIET in dit script opgeslagen.

cd /d "C:\dev\apps\wandel-met-mij"

echo.
echo [1/2] Resend API-sleutel als secret zetten (plak de sleutel en druk Enter)...
call firebase functions:secrets:set RESEND_API_KEY --project fsy-prep

echo.
echo [2/2] Functions deployen...
call firebase deploy --only functions --project fsy-prep

echo.
echo ========================================
echo  DEPLOY COMPLETE!
echo ========================================
pause
