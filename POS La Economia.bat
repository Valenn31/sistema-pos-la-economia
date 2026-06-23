@echo off
REM Abre el Sistema POS en Chrome con impresión silenciosa.
REM Requisito: configurar la ticketera como impresora predeterminada en Windows.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing http://localhost:5173
