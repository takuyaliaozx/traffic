@echo off
chcp 65001 > nul
echo ╔═══════════════════════════════════════════════════╗
echo ║         NetScout X - 网络监控工具 v1.0           ║
echo ╚═══════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查 Nmap
where nmap >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到 Nmap，端口扫描功能可能受限
    echo        请从 https://nmap.org/download.html 下载安装
    echo.
)

:: 启动后端
echo [1/2] 正在启动后端服务...
cd netscout-server
if not exist node_modules (
    echo       首次运行，正在安装依赖...
    call npm install
)
start "NetScout Server" cmd /c "npm start"

:: 等待后端启动
timeout /t 3 /nobreak > nul

:: 启动前端
echo [2/2] 正在启动前端服务...
cd ..\netscout-ui
if not exist node_modules (
    echo       首次运行，正在安装依赖...
    call npm install
)
start "NetScout UI" cmd /c "npm run dev"

:: 等待前端启动
timeout /t 3 /nobreak > nul

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║  启动完成！                                       ║
echo ║                                                   ║
echo ║  前端地址: http://localhost:5173                  ║
echo ║  后端地址: http://localhost:8080                  ║
echo ║                                                   ║
echo ║  按任意键打开浏览器...                            ║
echo ╚═══════════════════════════════════════════════════╝

pause > nul
start http://localhost:5173
