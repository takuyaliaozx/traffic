# NetScout X

网络监控工具，支持端口扫描、VPN检测、网络连接可视化。

## 功能

- 端口扫描：扫描本机开放端口，识别服务和进程
- VPN检测：检测 Clash、V2Ray、WireGuard 等代理软件，显示代理出口和真实IP
- 网络地图：可视化显示网络连接的地理位置分布
- 系统监控：CPU、内存、网络带宽实时监控
- 网络质量：延迟、丢包率监测

## 环境要求

- Node.js 16.0.0 或更高版本
- npm 8.0.0 或更高版本
- Windows 10/11、macOS 或 Linux

## 安装
```bash
cd netscout-x

cd netscout-server
npm install

cd ../netscout-ui
npm install
```

## 地图数据

下载 world.zh.json 放到 netscout-ui/public/ 目录：

https://github.com/apache/echarts/blob/master/test/data/map/json/world.json

## 启动

终端1 - 后端：
```bash
cd netscout-server
npm start
```

终端2 - 前端：
```bash
cd netscout-ui
npm run dev
```

访问 http://localhost:5173

## 目录结构
```
netscout-x/
├── netscout-server/
│   ├── index.js
│   └── package.json
├── netscout-ui/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── SystemOverview.tsx
│   │       ├── PortTable.tsx
│   │       ├── NetworkInfo.tsx
│   │       ├── NetworkMap.tsx
│   │       ├── BandwidthQuality.tsx
│   │       └── VPNStatus.tsx
│   ├── public/
│   │   └── world.zh.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

## 配置

后端端口默认 8080，修改 netscout-server/index.js：
```javascript
const PORT = 8080
```

前端端口默认 5173，修改 netscout-ui/vite.config.ts。

## 支持的代理软件

Clash、Clash for Windows、Clash Verge、V2Ray、Xray、Shadowsocks、Trojan、WireGuard、OpenVPN、Sing-Box、NekoRay、NordVPN、ExpressVPN、Surfshark 等。

## 问题

端口扫描权限不足：Windows 以管理员身份运行命令行。

无法检测VPN：确认代理软件运行中，系统代理已开启。

地图无法加载：检查 world.zh.json 是否存在于 public 目录。

IP位置显示Unknown：免费API有请求限制，部分IP无法获取信息。

## 技术栈

后端：Node.js、Express、Socket.IO、systeminformation、geoip-lite

前端：React、TypeScript、Vite、Ant Design、ECharts
