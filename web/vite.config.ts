// 文件职责：配置 Vite 的仓库内根目录、Svelte 插件、$lib 路径别名，以及 /api 与 /openapi 到本机 Host 的开发代理，支撑前端独立启动和联调；Host 自身没有内置端口默认值，代理目标指向开发脚本（scripts/dev.mjs）为 Host 设置并等待的 5080 端口，Vite 未配置 server.port，开发服务器使用默认 5173，与 Host 端口不同。
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:5080",
      "/openapi": "http://127.0.0.1:5080",
    },
  },
});
