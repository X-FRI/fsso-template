// 文件职责：并行启动后端 dotnet 开发进程和前端 Vite 服务，转发日志、处理端口与信号，并在退出时清理自己拥有的进程树，供本地联调使用。
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smoke = process.argv.includes("--smoke");
const dbFile = resolve(root, "artifacts/dev.db");
mkdirSync(dirname(dbFile), { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pnpm = process.env.npm_execpath;
const pnpmPrefix = pnpm?.includes("pnpm") ? [pnpm] : [];

const web = resolve(root, "web");
const children = [];
let shuttingDown = false;
let exitCode = 0;
let resolveFinished;
const finished = new Promise((resolve) => {
  resolveFinished = resolve;
});

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout.on("data", (chunk) =>
    process.stdout.write(`[${options.label}] ${chunk}`)
  );
  child.stderr.on("data", (chunk) =>
    process.stderr.write(`[${options.label}] ${chunk}`)
  );
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[${options.label}] exited unexpectedly (code=${code}, signal=${signal})`
    );
    exitCode = code && code > 0 ? code : 1;
    void shutdown();
  });
  children.push(child);
  return child;
}

async function waitFor(url, label) {
  const deadline = Date.now() + 90_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (shuttingDown) throw new Error("Shutting down.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(300);
  }
  throw new Error(`${label} did not become ready: ${lastError}`);
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  }
  await sleep(1_000);
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }
  }
  resolveFinished();
}

process.on("SIGINT", () => {
  exitCode = 130;
  void shutdown();
});
process.on("SIGTERM", () => {
  exitCode = 143;
  void shutdown();
});

try {
  start(
    "dotnet",
    [
      "run",
      "--project",
      "src/Host",
      "--no-launch-profile",
      "--urls",
      "http://127.0.0.1:5080",
    ],
    {
      label: "api",
      env: {
        FSSO_DB_PATH: dbFile,
        ASPNETCORE_ENVIRONMENT: "Development",
        ASPNETCORE_URLS: "http://127.0.0.1:5080",
      },
    }
  );
  start(
    pnpmPrefix[0] ? process.execPath : "pnpm",
    [...pnpmPrefix, "exec", "vite", "--config", "web/vite.config.ts", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { label: "web" }
  );

  await waitFor("http://127.0.0.1:5080/api/health", "API");
  await waitFor("http://127.0.0.1:5173/", "Vite");

  const response = await fetch("http://127.0.0.1:5173/api/demos", {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Vite proxy returned HTTP ${response.status}`);
  const payload = await response.json();
  console.log(
    `Dev proxy OK: /api/demos returned ${
      Array.isArray(payload.data) ? payload.data.length : "?"
    } items`
  );

  if (smoke) {
    console.log("Dev smoke complete; shutting down.");
    await sleep(500);
    await shutdown();
  } else {
    console.log(
      "Dev servers ready at http://127.0.0.1:5173 (Ctrl-C to stop, --smoke for bounded check)."
    );
  }
} catch (error) {
  exitCode = 1;
  console.error(error.message);
  await shutdown();
}

await finished;
process.exit(exitCode);
