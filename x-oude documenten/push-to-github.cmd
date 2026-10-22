@echo off
REM Wandel met Mij - Push changes to GitHub (triggers Netlify deploy)

echo.
echo ========================================
echo  Push to GitHub -^> Netlify deploy
echo ========================================
echo.

cd /d "C:\dev\apps\wandel-met-mij"

echo [1/4] Checking what will be committed...
git status
echo.

echo [2/4] Staging changes (excluding sensitive files)...
git add index.html authLibrary.js functions/index.js functions/package.json firebase.json .firebaserc
git add -u
echo.

echo [3/4] Creating commit...
git commit -m "Add email+code authentication with cloud sync" -m "Features:" -m "- Email + 6-digit code login via Resend (noreply@realgood.nl)" -m "- Cloud sync of localStorage data to Firestore" -m "- Multi-device recovery (login elsewhere, data restored)" -m "- Auto-sync every 30s and on page unload" -m "- Nice Dutch UI with login/logout/sync status" -m "- Firebase Functions: sendCode, verifyCode, getAccount, syncData, restoreData" -m "" -m "Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_013toUdu2h5aR7MnMUh91MKw"
echo.

echo [4/4] Pushing to GitHub...
git push

echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo Netlify should auto-deploy within 1-2 minutes.
echo.
echo Check deploy status at:
echo   https://app.netlify.com
echo.
echo Then on your phone:
echo  1. Open the app (wandelmetmij.netlify.app)
echo  2. Hard refresh / clear cache
echo  3. You should see the new email login UI
echo.
pause
