@echo off
chcp 65001 > nul
title Backup - Neon Roulette Pro
echo.
node "%~dp0scripts\backup.js"
echo.
pause
