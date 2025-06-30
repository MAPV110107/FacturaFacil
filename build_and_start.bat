@echo off
echo ===================================
echo  FACTURAFACIL - BUILD & START SCRIPT
echo ===================================
echo.

echo [1/4] Installing dependencies...
call npm install
echo.

echo [2/4] Attempting to fix vulnerabilities...
call npm audit fix --force
echo.

echo [3/4] Creating production build...
call npm run build
echo.

echo [4/4] Starting production server...
echo Remember to start the bridge server in a separate terminal.
call npm start

echo.
echo Script finished.
pause
