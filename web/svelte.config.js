// 文件职责：只启用 Svelte 的 Vite 预处理器，不使用 SvelteKit 路由或适配器，让纯 Vite 构建能够编译 .svelte 组件，同时保留 Vite 插件链的最小配置，避免引入额外运行层。
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
};
