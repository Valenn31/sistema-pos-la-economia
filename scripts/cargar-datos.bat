@echo off
echo ========================================
echo   Cargando datos de prueba...
echo ========================================
echo.
cd /d "%~dp0.."
node scripts/seed.mjs
echo.
pause
