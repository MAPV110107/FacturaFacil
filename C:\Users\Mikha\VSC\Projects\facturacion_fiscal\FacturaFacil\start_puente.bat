@echo off
title Servidor Puente - FacturaFacil
echo.
echo ===========================================
echo   Iniciando Servidor Puente FacturaFacil
echo ===========================================
echo.
echo Este servidor escucha las solicitudes de la
echo aplicacion web y las envia a la impresora.
echo.
echo No cierre esta ventana mientras necesite
echo imprimir documentos fiscales.
echo.

node src/puente/servidor.js

echo.
echo El servidor se ha detenido. Presione cualquier tecla para cerrar.
pause > nul
