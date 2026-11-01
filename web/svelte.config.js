// 文件职责：把 web 目录配置为单包内的 SvelteKit 根，使用 adapter-node 输出 Node 服务，并启用 Vite 预处理；不引入工作区，也不把前端改回 Vite 单页挂载。
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: "build" }),
  },
};

export default config;
