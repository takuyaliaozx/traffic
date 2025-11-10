#!/bin/bash

# NetScout X 启动脚本 (macOS/Linux)

echo "====================================="
echo "    NetScout X 启动脚本 🚀"
echo "====================================="
echo ""

# 检查 Node.js 是否安装
echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "✗ 未检测到 Node.js，请先安装 Node.js!"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js 版本: $NODE_VERSION"
echo ""

# 检查依赖是否安装
echo "检查项目依赖..."

if [ ! -d "netscout-server/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd netscout-server
    npm install
    cd ..
    echo "✓ 后端依赖安装完成"
else
    echo "✓ 后端依赖已存在"
fi

if [ ! -d "netscout-ui/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd netscout-ui
    npm install
    cd ..
    echo "✓ 前端依赖安装完成"
else
    echo "✓ 前端依赖已存在"
fi

echo ""
echo "====================================="
echo "    启动服务..."
echo "====================================="
echo ""

# 启动后端服务器（后台运行）
echo "启动后端服务器..."
cd netscout-server
npm start &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端服务器（后台运行）
echo "启动前端服务器..."
cd netscout-ui
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "====================================="
echo "    启动完成！"
echo "====================================="
echo ""
echo "前端地址: http://localhost:5173"
echo "后端地址: http://localhost:8080"
echo ""
echo "进程 ID:"
echo "  后端: $BACKEND_PID"
echo "  前端: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 捕获 Ctrl+C 信号
trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 保持脚本运行
wait

