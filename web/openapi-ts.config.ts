// 文件职责：配置 hey-api 的 OpenAPI 输入路径、SDK 输出目录与 typescript、client-fetch、sdk 插件组合，驱动生成 web/src/lib/api/generated 下的契约代码，输入固定为 openapi/openapi.json，生成物不得手工修改。
import { defineConfig } from "@hey-api/openapi-ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  input: resolve(here, "../openapi/openapi.json"),
  output: {
    path: resolve(here, "src/lib/api/generated"),
    postProcess: ["prettier"],
  },
  plugins: [
    { name: "@hey-api/typescript" },
    { name: "@hey-api/client-fetch" },
    { name: "@hey-api/sdk" },
  ],
});
