// 文件职责：Playwright 前端启动包装，直接调用仓库内 Vite 可执行文件以严格端口启动开发服务器，并把 SIGINT 与 SIGTERM 转换为整组进程的有序终止。
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// 固定 5173 与 --strictPort，让 Playwright 配置的 webServer 地址始终一致。
const child = spawn(
  process.execPath,
  [
    resolve(here, "../../node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ],
  {
    cwd: resolve(here, ".."),
    env: process.env,
    stdio: "inherit",
    detached: true,
  }
);

let stopping = false;

// 与后端相同，按进程组发送信号，防止 Vite 子进程残留。
function stop() {
  if (stopping) return;
  stopping = true;

  if (child.exitCode === null && child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    if (child.exitCode === null && child.pid) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }
    process.exit(0);
  }, 3_000);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
