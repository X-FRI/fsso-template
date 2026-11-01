// 文件职责：停止把根组件挂到 #app。SvelteKit 的文档入口是 src/app.html，路由入口是 src/routes，本模块不再作为浏览器启动脚本，也不再加载全局样式。
export const frontendEntry = "sveltekit";
