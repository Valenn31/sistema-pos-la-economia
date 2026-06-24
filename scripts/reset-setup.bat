@echo off
echo ========================================
echo   REINICIANDO SISTEMA COMPLETO
echo   Esto borra TODO: datos, usuarios
echo   y configuracion del negocio.
echo ========================================
echo.
cd /d "%~dp0.."
node scripts/reset-setup.mjs
echo.
pause
