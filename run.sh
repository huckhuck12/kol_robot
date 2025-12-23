#!/bin/bash

echo "========================================"
echo "KOL交易信号推送系统 - 运行脚本"
echo "========================================"
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null
then
    echo "错误: 未检测到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

echo "已检测到Node.js"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
    echo "依赖安装完成"
fi

echo "正在启动系统..."
echo "========================================"
echo "系统将在后台运行，按 Ctrl+C 停止"
echo "========================================"
echo

# 启动应用
node src/index.js
