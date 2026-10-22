@echo off
REM ═══════════════════════════════════════════════════════════════
REM  Wandel met Mij — PUBLISH
REM  Doet alles in 1 keer:
REM    1. Firebase deploy (functions + hosting)      → fsy-prep.web.app
REM    2. Git commit + push                          → wandelmetmij.netlify.app
REM ═══════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion
cd /d "C:\dev\apps\wandel-met-mij"

echo.
echo ========================================
echo  Wandel met Mij — PUBLISH
echo ========================================
echo.
echo Dit script publiceert naar:
echo   - Firebase  (fsy-prep.web.app)
echo   - Netlify   (wandelmetmij.netlify.app via GitHub)
echo.
set /p CONFIRM="Doorgaan? [j/N] "
if /i NOT "%CONFIRM%"=="j" (
    echo Afgebroken.
    pause
    exit /b 0
)

echo.
echo ----------------------------------------
echo  STAP 1/2 - Firebase deploy
echo ----------------------------------------
call firebase deploy --project fsy-prep
if %errorlevel% neq 0 (
    echo.
    echo *** Firebase deploy mislukt - stoppen ***
    pause
    exit /b 1
)

echo.
echo ----------------------------------------
echo  STAP 2/2 - Git push naar GitHub
echo ----------------------------------------
echo.

REM Toon wat er gewijzigd is
git status --short

echo.
set /p PUSH="Doorgaan met git push? [j/N] "
if /i NOT "%PUSH%"=="j" (
    echo Git push overgeslagen. Firebase deploy is wel voltooid.
    pause
    exit /b 0
)

REM Vraag commit message
set /p COMMITMSG="Commit bericht (Enter voor 'Update'): "
if "!COMMITMSG!"=="" set COMMITMSG=Update

git add -A
git commit -m "!COMMITMSG!" -m "Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_013toUdu2h5aR7MnMUh91MKw"
git push

echo.
echo ========================================
echo  KLAAR!
echo ========================================
echo.
echo Firebase: live over ~30 sec op https://fsy-prep.web.app
echo Netlify:  auto-deploy start, live over 1-2 min op https://wandelmetmij.netlify.app
echo.
pause
