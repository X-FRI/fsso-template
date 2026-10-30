// 文件职责：Vite 类型声明补丁，引用 Svelte 与 Vite 客户端类型并声明可选的 VITE_API_BASE_URL 环境变量，使 import.meta.env 在组件和客户端配置中获得类型检查。
/// <reference types="svelte" />
/// <reference types="vite/client" />

// 只声明本项目使用的环境变量，避免扩大 import.meta.env 的类型面。
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
