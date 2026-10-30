// 文件职责：生成 SDK 客户端配置入口，从 Vite 环境变量 VITE_API_BASE_URL 读取可选基础地址，仅在存在时覆盖默认同源配置，然后导出共享 client 实例。
import { client } from "./generated/client.gen";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

// 未设置环境变量时保留生成客户端的同源默认值，生产静态站点因此可直接调用同域 /api。
if (baseUrl) {
  client.setConfig({ baseUrl });
}

export { client };
