// 文件职责：API 聚合导出入口，把生成的 SDK 函数和类型与配置后的 client 实例统一转出，让组件通过稳定模块路径引用而不直接依赖生成目录结构。
export * from "./generated";
// 重新导出配置后的客户端，调用方无需再单独导入 client.ts。
export { client } from "./client";
