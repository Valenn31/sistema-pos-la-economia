@echo off
echo ========================================
echo   Vaciando base de datos...
echo ========================================
echo.
cd /d "%~dp0.."
node scripts/vaciar-db.mjs
echo.
pause
