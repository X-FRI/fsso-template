// 文件职责：对临时 SQLite 数据库执行 .backup 与 .restore，并用行数统计和恢复后 HTTP GET/列表验证备份可用与业务数据可读；不运行 PRAGMA integrity_check，也不单独断言 schema_migrations。
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  assert,
  httpJson,
  killOwnedTree,
  root,
  runLogged,
  sleep,
  startProcess,
  waitForHttp,
} from "./lib.mjs";

const artifacts = resolve(root, "artifacts");
const hostDll = resolve(artifacts, "publish", "Fsso.Host.dll");
const work = resolve(artifacts, "backup-check", `${Date.now()}-${process.pid}`);
const sourceDb = resolve(work, "source.db");
const backupDb = resolve(work, "backup.db");
const restoredDb = resolve(work, "restored.db");

let host = null;

async function stopHost() {
  if (!host) return;
  const pid = host.pid;
  await killOwnedTree(pid);
  await Promise.race([new Promise((resolve) => host.once("exit", resolve)), sleep(5_000)]);
  host = null;
}

async function startHost(dbPath) {
  let base = null;
  let log = "";
  host = startProcess("backup-host", "dotnet", [hostDll], {
    cwd: root,
    logFile: resolve(work, `host-${Date.now()}.log`),
    onText: (text) => {
      log += text;
      const match = log.match(/Now listening on:\s*(http:\/\/[^\s]+)/);
      if (match) base = match[1].replace(/\/+$/, "");
    },
    env: {
      ...process.env,
      FSSO_DB_PATH: dbPath,
      ASPNETCORE_URLS: "http://127.0.0.1:0",
      ASPNETCORE_ENVIRONMENT: "Development",
      FSSO_FAULT_INJECTION: "0",
    },
  });

  const deadline = Date.now() + 60_000;
  while (!base) {
    if (host.exitCode !== null) throw new Error(`host exited early with code ${host.exitCode}`);
    if (Date.now() > deadline) throw new Error("host did not report a listening address");
    await sleep(100);
  }
  await waitForHttp(`${base}/api/health`, { child: host, label: "backup host" });
  return base;
}

try {
  assert(existsSync(hostDll), `published host missing: ${hostDll}; run pnpm build first`);
  assert(!existsSync(work), `backup work directory already exists: ${work}`);
  mkdirSync(work, { recursive: true });

  let base = await startHost(sourceDb);
  const created = await httpJson(`${base}/api/demos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Backup demo ${Date.now()}`, description: "sqlite backup check" }),
  });
  assert(created.status === 201, `create expected 201, got ${created.status}: ${created.text}`);
  assert(created.json?.id, `create response missing id: ${created.text}`);
  const id = created.json.id;
  await stopHost();

  assert(existsSync(sourceDb), "source DB missing after create");
  const preflight = runLogged("sqlite3 preflight", "sqlite3", [sourceDb, ".timeout 5000", "SELECT COUNT(*) FROM demos;"]);
  assert(preflight.status === 0 && preflight.output.trim() === "1", `source DB preflight expected one row: ${preflight.output}`);
  const backup = runLogged("sqlite3 backup", "sqlite3", [sourceDb, ".timeout 5000", `.backup '${backupDb}'`]);
  assert(backup.status === 0, `sqlite3 .backup failed RC=${backup.status}`);
  assert(existsSync(backupDb), "backup DB not created");
  const backupCount = runLogged("sqlite3 backup count", "sqlite3", [backupDb, "SELECT COUNT(*) FROM demos;"]);
  assert(backupCount.status === 0 && backupCount.output.trim() === "1", `backup DB expected one row: ${backupCount.output}`);

  rmSync(restoredDb, { force: true });
  const restore = runLogged("sqlite3 restore", "sqlite3", [restoredDb, `.restore '${backupDb}'`]);
  assert(restore.status === 0, `sqlite3 .restore failed RC=${restore.status}`);
  assert(existsSync(restoredDb), "restored DB not created");

  base = await startHost(restoredDb);
  const byId = await httpJson(`${base}/api/demos/${id}`);
  assert(byId.status === 200, `restored GET expected 200, got ${byId.status}: ${byId.text}`);
  assert(byId.json?.id === id, "restored row id mismatch");

  const listed = await httpJson(`${base}/api/demos?page=1&limit=10`);
  assert(listed.status === 200, `restored list expected 200, got ${listed.status}: ${listed.text}`);
  assert(listed.json?.total === 1, `restored list expected total=1, got ${listed.json?.total}`);
  assert(listed.json?.data?.length === 1 && listed.json.data[0].id === id, "restored list row mismatch");

  console.log(`sqlite-backup-check: OK (synthetic ${work}; backup+restore+HTTP readback)`);
} catch (error) {
  console.error(`sqlite-backup-check: FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await stopHost();
}
