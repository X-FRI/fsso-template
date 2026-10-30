// 文件职责：Playwright 后端启动包装，先清理 artifacts/e2e.db 及其 wal 文件，再以固定端口和临时数据库启动 dotnet Host，并在收到信号时终止整个进程组。
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const db = resolve(root, "artifacts/e2e.db");

// 删除主库及 wal/shm 边车文件，确保 Playwright 每次从空数据库开始。
mkdirSync(dirname(db), { recursive: true });
for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });

// 使用独立进程组启动 Host，信号可以传播到 dotnet 子进程。
const child = spawn(
  "dotnet",
  ["run", "--project", "src/Host", "--no-launch-profile", "--urls", "http://127.0.0.1:5080"],
  {
    cwd: root,
    env: {
      ...process.env,
      FSSO_DB_PATH: db,
      ASPNETCORE_ENVIRONMENT: "Development",
      ASPNETCORE_URLS: "http://127.0.0.1:5080",
    },
    stdio: "inherit",
    detached: true,
  }
);

let stopping = false;

// 先 SIGTERM 等待三秒再 SIGKILL，避免遗留监听固定端口的进程。
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
