@echo off

echo ========================================
echo KOL交易信号推送系统 - 运行脚本
echo ========================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 已检测到Node.js

:: 检查是否已安装依赖
if not exist node_modules (
    echo 正在安装依赖...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
    echo 依赖安装完成
)

echo 正在启动系统...
echo ========================================
echo 系统将在后台运行，按 Ctrl+C 停止
echo ========================================
echo.

:: 启动应用
node src/index.js

pause
