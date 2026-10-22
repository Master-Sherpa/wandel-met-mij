@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  Wandel met Mij - veilig naar GitHub (en dus naar Netlify)
REM
REM  Vervangt push-to-github.cmd. Dat script had een vast
REM  commitbericht en legde blind vast wat er op schijf stond.
REM  Daardoor verdween op 22-10-2026 de hele borstplaat uit de
REM  live versie, onder het bericht "Add email+code
REM  authentication with cloud sync".
REM
REM  Dit script laat eerst zien WAT er verandert, waarschuwt bij
REM  grote verwijderingen, en vraagt om een eigen bericht.
REM ============================================================

cd /d "C:\dev\apps\wandel-met-mij"

echo.
echo ============================================
echo  1/5  Welke bestanden zijn gewijzigd
echo ============================================
git status --short
echo.

echo ============================================
echo  2/5  Hoeveel regels, per bestand
echo ============================================
git diff HEAD --stat
echo.

echo ============================================
echo  3/5  Welke versie ligt hier
echo ============================================
findstr /C:"WMM-BUILD" index.html
echo.

echo ============================================
echo  4/5  Controle op grote verwijderingen
echo ============================================
set ERBIJ=0
set WEG=0
for /f "tokens=1,2" %%a in ('git diff HEAD --numstat -- index.html 2^>nul') do (
  set ERBIJ=%%a
  set WEG=%%b
)
if "!WEG!"=="0" (
  echo    index.html is niet gewijzigd.
) else (
  echo    index.html:  +!ERBIJ! regels erbij,  -!WEG! regels eraf
  if !WEG! GTR 200 (
    echo.
    echo    ***************************************************
    echo    *  LET OP: meer dan 200 regels worden VERWIJDERD. *
    echo    *  Bij een werkende app is dat bijna nooit goed.  *
    echo    *  Werk je wel op de nieuwste versie? Kijk bij    *
    echo    *  stap 3 naar de datum achter WMM-BUILD.         *
    echo    ***************************************************
    echo.
    set /p DOOR="    Toch doorgaan? Typ JA om door te gaan: "
    if /i not "!DOOR!"=="JA" (
      echo.
      echo    Afgebroken. Er is niets vastgelegd of verstuurd.
      echo.
      pause
      exit /b 1
    )
  )
)
echo.

echo ============================================
echo  5/5  Vastleggen en versturen
echo ============================================
set BERICHT=
set /p BERICHT="Beschrijf in een zin wat je hebt veranderd: "
if "!BERICHT!"=="" (
  echo.
  echo    Geen bericht ingevuld. Afgebroken, er is niets verstuurd.
  echo.
  pause
  exit /b 1
)

git add -A
git commit -m "!BERICHT!"
if errorlevel 1 (
  echo.
  echo    Er viel niets vast te leggen, of er ging iets mis.
  echo.
  pause
  exit /b 1
)

git push
if errorlevel 1 (
  echo.
  echo    Versturen mislukt. Lees de melding hierboven.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Klaar
echo ============================================
echo.
echo  Netlify bouwt nu vanzelf. Na een minuut of twee staat
echo  het op https://wandelmetmij.netlify.app
echo.
echo  Let op: dit stuurt alleen de website. Zijn de Cloud
echo  Functions of de Firestore-regels veranderd, dan moet
echo  je daarnaast nog:
echo     firebase deploy --only functions
echo     firebase deploy --only firestore:rules
echo.
pause
