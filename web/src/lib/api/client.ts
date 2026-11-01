// 文件职责：配置生成的 fetch 客户端。浏览器未设置 VITE_API_BASE_URL 时走当前源，由开发代理或 SvelteKit 服务端钩子转发；服务端渲染若发起请求则直接访问 FSSO_API_ORIGIN，不连接 SQLite。
import { browser } from "$app/environment";
import { client } from "./generated/client.gen";

const publicBase = import.meta.env.VITE_API_BASE_URL;

if (publicBase) {
  client.setConfig({ baseUrl: publicBase });
} else if (!browser) {
  client.setConfig({
    baseUrl: (process.env.FSSO_API_ORIGIN || "http://127.0.0.1:5080").replace(/\/+$/, ""),
  });
}

export { client };
