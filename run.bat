@echo off
title KEAOS - Enterprise Agent Operating Studio
echo.
echo ===================================================
echo  KEAOS ^| Enterprise Agent Operating Studio
echo  Starting local development server...
echo ===================================================
echo.

if not exist node_modules (
    echo [KEAOS] node_modules directory missing. Installing dependencies...
    call npm install
)

echo [KEAOS] Starting High-Concurrency Execution Gateway (Port 4000)...
start /B node server/index.js

echo [KEAOS] Launching Vite development server...
call npm run dev -- --open --host 127.0.0.1

