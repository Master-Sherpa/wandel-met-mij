@echo off
REM ═══════════════════════════════════════════════════════════════
REM  Wandel met Mij — Nieuwe Resend API key instellen
REM  Gebruik dit alleen als je de key wilt wijzigen (zelden)
REM ═══════════════════════════════════════════════════════════════

cd /d "C:\dev\apps\wandel-met-mij"

echo.
echo ========================================
echo  Resend API-sleutel instellen
echo ========================================
echo.
echo Je gaat zo gevraagd worden om de nieuwe RESEND_API_KEY te plakken.
echo Haal deze op van: https://resend.com/api-keys
echo.
echo Formaat: re_XXXXXXXXXX...
echo.
echo Druk Enter om door te gaan, of sluit het venster om te annuleren.
pause > nul

call firebase functions:secrets:set RESEND_API_KEY --project fsy-prep

echo.
echo ----------------------------------------
echo  Vergeet niet publish.cmd uit te voeren
echo  om de nieuwe key naar functions te deployen!
echo ----------------------------------------
echo.
pause
