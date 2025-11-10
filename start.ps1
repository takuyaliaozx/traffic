# NetScout X 启动脚本 (Windows PowerShell)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    NetScout X 启动脚本 🚀" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
Write-Host "检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 未检测到 Node.js，请先安装 Node.js!" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# 检查依赖是否安装
Write-Host "检查项目依赖..." -ForegroundColor Yellow

if (-not (Test-Path "netscout-server\node_modules")) {
    Write-Host "正在安装后端依赖..." -ForegroundColor Yellow
    Set-Location netscout-server
    npm install
    Set-Location ..
    Write-Host "✓ 后端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 后端依赖已存在" -ForegroundColor Green
}

if (-not (Test-Path "netscout-ui\node_modules")) {
    Write-Host "正在安装前端依赖..." -ForegroundColor Yellow
    Set-Location netscout-ui
    npm install
    Set-Location ..
    Write-Host "✓ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 前端依赖已存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    启动服务..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 启动后端服务器
Write-Host "启动后端服务器..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\netscout-server'; npm start"

# 等待几秒让后端启动
Start-Sleep -Seconds 3

# 启动前端服务器
Write-Host "启动前端服务器..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\netscout-ui'; npm run dev"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    启动完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "前端地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "后端地址: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示: 两个新窗口已打开，关闭它们即可停止服务" -ForegroundColor Yellow
Write-Host ""
Write-Host "按任意键退出此窗口..." -ForegroundColor Gray
pause

