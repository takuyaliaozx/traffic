/// <reference types="vite/client" />

// 声明 JSON 模块
declare module '*.json' {
  const value: any
  export default value
}
