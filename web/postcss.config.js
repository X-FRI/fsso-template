// 文件职责：保留 PostCSS 配置文件以维持基线路径，但不再注册 Tailwind 3 或 Autoprefixer；样式由 Tailwind 4 的 Vite 插件和 routes/layout.css 处理，本文件不生成视觉规则，以免构建期再加载旧插件。
export default {
  plugins: {},
};
