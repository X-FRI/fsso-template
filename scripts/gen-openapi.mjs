// 文件职责：用临时数据库启动 Host，等待健康检查后导出 OpenAPI 文档并写回 openapi/openapi.json，同时核对七个操作标识，属于生成入口而非手工编辑文件。
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, "openapi/openapi.json");
const dbFile = resolve(root, "artifacts/openapi-gen.db");
const port = 5188;
const base = `http://127.0.0.1:${port}`;

for (const suffix of ["", "-shm", "-wal"]) rmSync(`${dbFile}${suffix}`, { force: true });
mkdirSync(dirname(outFile), { recursive: true });
mkdirSync(dirname(dbFile), { recursive: true });

const host = spawn(
  "dotnet",
  ["run", "--project", "src/Host", "--no-launch-profile", "--urls", base],
  {
    cwd: root,
    env: {
      ...process.env,
      FSSO_DB_PATH: dbFile,
      ASPNETCORE_ENVIRONMENT: "Development",
      ASPNETCORE_URLS: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let logs = "";
host.stdout.on("data", (chunk) => (logs += chunk.toString()));
host.stderr.on("data", (chunk) => (logs += chunk.toString()));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth() {
  const deadline = Date.now() + 60_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (host.exitCode !== null) throw new Error(`Host exited ${host.exitCode}\n${logs}`);
    try {
      const response = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(250);
  }
  throw new Error(`Host did not become healthy (${lastError})\n${logs}`);
}

let exitCode = 0;
try {
  await waitForHealth();
  const response = await fetch(`${base}/openapi/v1.json`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`OpenAPI export failed: HTTP ${response.status}`);
  const document = await response.json();
  const operationIds = Object.values(document.paths ?? {}).flatMap((path) =>
    Object.values(path).map((operation) => operation?.operationId).filter(Boolean)
  );
  const expected = ["createDemo", "listDemos", "getDemo", "deleteDemo", "health", "createNote", "getNote"];
  const missing = expected.filter((id) => !operationIds.includes(id));
  if (missing.length) throw new Error(`Missing operationIds: ${missing.join(", ")}`);
  if (operationIds.length !== expected.length) {
    throw new Error(`Expected exactly ${expected.length} operationIds, got ${operationIds.length}: ${operationIds.join(", ")}`);
  }
  writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
  JSON.parse((await import("node:fs")).readFileSync(outFile, "utf8"));
  console.log(`Wrote ${outFile} (${operationIds.length} operations)`);
} catch (error) {
  exitCode = 1;
  console.error(error.message);
} finally {
  if (host.exitCode === null) {
    host.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => host.once("exit", resolve)),
      sleep(5_000).then(() => host.kill("SIGKILL")),
    ]);
  }
}

process.exit(exitCode);
