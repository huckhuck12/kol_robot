@echo off

echo ========================================
echo KOL Trading Signal Push System
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js detected.

:: Check if dependencies are installed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Dependencies installed.
)

echo Starting system...
echo ========================================
echo System is running. Press Ctrl+C to stop.
echo ========================================
echo.

:: Start the application
node src/index.js

pause
