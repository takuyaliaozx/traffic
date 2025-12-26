#!/bin/bash

echo "╔═══════════════════════════════════════════════════╗"
echo "║         NetScout X - 网络监控工具 v1.0           ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 检查 Nmap
if ! command -v nmap &> /dev/null; then
    echo "[警告] 未检测到 Nmap，端口扫描功能可能受限"
    echo "       Ubuntu/Debian: sudo apt install nmap"
    echo "       macOS: brew install nmap"
    echo ""
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 启动后端
echo "[1/2] 正在启动后端服务..."
cd "$SCRIPT_DIR/netscout-server"
if [ ! -d "node_modules" ]; then
    echo "      首次运行，正在安装依赖..."
    npm install
fi
npm start &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "[2/2] 正在启动前端服务..."
cd "$SCRIPT_DIR/netscout-ui"
if [ ! -d "node_modules" ]; then
    echo "      首次运行，正在安装依赖..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 3

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  启动完成！                                       ║"
echo "║                                                   ║"
echo "║  前端地址: http://localhost:5173                  ║"
echo "║  后端地址: http://localhost:8080                  ║"
echo "║                                                   ║"
echo "║  按 Ctrl+C 停止所有服务                          ║"
echo "╚═══════════════════════════════════════════════════╝"

# 打开浏览器
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

# 捕获退出信号
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# 等待进程
wait
