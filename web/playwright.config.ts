// 文件职责：定义端到端测试目录、单 worker 串行执行、Chromium 项目、基础地址与失败追踪，并配置独立后端和前端 webServer 的启动命令、健康地址和优雅关闭。
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const useExternalApp = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: useExternalApp
    ? undefined
    : [
        {
          command: "node e2e/start-backend.mjs",
          url: "http://127.0.0.1:5080/api/health",
          timeout: 120_000,
          reuseExistingServer: false,
          gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
        },
        {
          command: "node e2e/start-frontend.mjs",
          url: "http://127.0.0.1:5173/",
          timeout: 120_000,
          reuseExistingServer: false,
          gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
        },
      ],
});
