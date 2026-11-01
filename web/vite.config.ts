// 文件职责：为 SvelteKit 挂上 Tailwind 4 的 Vite 插件，并把浏览器访问的 /api 与 /openapi 代理到 FSSO_API_ORIGIN；代理只转发 HTTP，不打开 SQLite，也不做数据库认证，单元测试仍使用 node 环境。表单校验走官方适配器公开入口，本配置不再替换第三方模块。
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

const apiOrigin = process.env.FSSO_API_ORIGIN ?? "http://127.0.0.1:5080";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": apiOrigin,
      "/openapi": apiOrigin,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
  },
});
