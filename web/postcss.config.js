// 文件职责：向 Vite 的 PostCSS 管线注册 Tailwind 与 Autoprefixer，并显式指向同目录的 tailwind.config.js，使样式构建与主题配置保持一致，插件顺序保持 Tailwind 在前，避免样式失效。
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: resolve(here, "tailwind.config.js") },
    autoprefixer: {},
  },
};
