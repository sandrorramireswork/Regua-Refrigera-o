@echo off
chcp 65001 > nul
title Backup - Regua Refrigeracao TermoMaster Pro
echo.
node "%~dp0scripts\backup.js"
echo.
pause
