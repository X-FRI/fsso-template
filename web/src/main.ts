// 文件职责：浏览器启动入口，先加载全局 CSS，再用 Svelte 5 mount 把根组件挂到 #app 节点并导出应用实例，不包含路由或数据预取逻辑。
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

// 使用非空断言获取挂载点，index.html 保证 #app 存在；挂载失败会在启动阶段直接报错。
const app = mount(App, { target: document.getElementById("app")! });

export default app;
