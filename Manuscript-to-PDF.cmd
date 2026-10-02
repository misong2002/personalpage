@echo off
chcp 65001 >nul
node "%~dp0scripts\manuscript-interactive.mjs" "%~1"
