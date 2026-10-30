// 文件职责：对发布产物启动独立 Host，验证健康检查、Demo 创建列表详情删除、Notes 创建获取、静态资源与进程唯一性，作为发布前快速冒烟。
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  assert,
  assertSingleDotnetTree,
  httpJson,
  killOwnedTree,
  root,
  sleep,
  startProcess,
  waitForHttp,
} from "./lib.mjs";

const publish = resolve(root, "artifacts/publish");
const dll = resolve(publish, "Fsso.Host.dll");
const db = resolve(root, "artifacts/release-smoke.db");
const port = Number(process.env.FSSO_RELEASE_PORT ?? 0);
const listenUrl = `http://127.0.0.1:${Number.isInteger(port) ? port : 0}`;
const logFile = resolve(root, "artifacts/release-smoke.log");

assert(existsSync(dll), `published DLL missing: ${dll} (run pnpm build first)`);
assert(existsSync(resolve(publish, "wwwroot/index.html")), "published index.html missing");
for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
mkdirSync(resolve(root, "artifacts"), { recursive: true });

let host = null;
let base = null;
let hostLog = "";
let exitCode = 0;

function startHost() {
  base = null;
  hostLog = "";
  return startProcess("host", "dotnet", [dll], {
    cwd: publish,
    logFile,
    onText: (text) => {
      hostLog += text;
      const match = hostLog.match(/Now listening on:\s*(http:\/\/[^\s]+)/);
      if (match) base = match[1].replace(/\/+$/, "");
    },
    env: {
      ...process.env,
      FSSO_DB_PATH: db,
      ASPNETCORE_URLS: listenUrl,
      ASPNETCORE_ENVIRONMENT: "Production",
      FSSO_FAULT_INJECTION: "0",
    },
  });
}

async function waitForApp(label) {
  const deadline = Date.now() + 60_000;
  while (!base) {
    if (host.exitCode !== null) throw new Error(`${label} exited early with code ${host.exitCode}`);
    if (Date.now() > deadline) throw new Error(`${label} did not report a listening address`);
    await sleep(100);
  }
  await waitForHttp(`${base}/api/health`, { child: host, label });
}

async function stopHost() {
  if (!host) return;
  const pid = host.pid;
  await killOwnedTree(pid);
  await Promise.race([
    new Promise((resolve) => host.once("exit", resolve)),
    sleep(5_000),
  ]);
  host = null;
}

try {
  host = startHost();
  await waitForApp("published app");
  assertSingleDotnetTree(host.pid);
  console.log(`Single process tree verified for PID ${host.pid} (no Node child).`);

  const index = await fetch(`${base}/`);
  assert(index.status === 200, `GET / returned ${index.status}`);
  assert((index.headers.get("content-type") ?? "").includes("text/html"), "GET / is not HTML");
  const html = await index.text();
  assert(/<div id="app">/.test(html), "GET / did not return the SPA index");

  const assetMatch = html.match(/(?:src|href)="(\/assets\/[^"]+\.js)"/);
  assert(assetMatch, "index has no /assets/*.js reference");
  const asset = await fetch(`${base}${assetMatch[1]}`);
  const assetType = asset.headers.get("content-type") ?? "";
  assert(asset.status === 200, `GET ${assetMatch[1]} returned ${asset.status}`);
  assert(assetType.includes("javascript"), `asset content-type is ${assetType}`);

  const health = await httpJson(`${base}/api/health`);
  assert(health.status === 200 && health.json?.status === "ok", "health endpoint failed");

  const unknown = await httpJson(`${base}/api/unknown`);
  assert(unknown.status === 404, `unknown API returned ${unknown.status}`);
  assert((unknown.response.headers.get("content-type") ?? "").includes("application/json"), "unknown API is not JSON");
  assert(
    JSON.stringify(Object.keys(unknown.json ?? {}).sort()) ===
      JSON.stringify(["code", "message", "statusCode", "traceId"]),
    `unknown API body is not ErrorResponse: ${unknown.text}`
  );
  assert(!unknown.text.includes("<!doctype html>") && !unknown.text.includes("<html"), "unknown API fell back to HTML");

  const created = await httpJson(`${base}/api/demos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Release Smoke ${Date.now()}`, description: "release smoke" }),
  });
  assert(created.status === 201, `POST /api/demos returned ${created.status}: ${created.text}`);
  const id = created.json?.id;
  assert(typeof id === "string" && id.length > 0, "created demo has no id");

  const listed = await httpJson(`${base}/api/demos?page=1&limit=10`);
  assert(listed.status === 200, `GET list returned ${listed.status}`);
  assert(Array.isArray(listed.json?.data) && listed.json.data.some((item) => item.id === id), "created demo not listed");
  assert(listed.json.total >= 1, "list total is not >= 1");

  const badPage = await httpJson(`${base}/api/demos?page=0`);
  assert(badPage.status === 400, `invalid pagination returned ${badPage.status}`);
  assert((badPage.response.headers.get("content-type") ?? "").includes("application/json"), "400 is not JSON");

  const fetched = await httpJson(`${base}/api/demos/${id}`);
  assert(fetched.status === 200 && fetched.json?.id === id, "GET detail failed");

  const noteTitle = `Release Smoke Note ${Date.now()}`;
  const note = await httpJson(`${base}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: noteTitle, body: "release smoke note" }),
  });
  assert(note.status === 201, `POST /api/notes returned ${note.status}: ${note.text}`);
  assert(typeof note.json?.id === "string" && note.json.id.length > 0, "created note has no id");
  const noteId = note.json.id;
  const fetchedNote = await httpJson(`${base}/api/notes/${noteId}`);
  assert(fetchedNote.status === 200, `GET /api/notes/{id} returned ${fetchedNote.status}`);
  assert(fetchedNote.json?.id === noteId && fetchedNote.json?.title === noteTitle, "GET note mismatch");

  await stopHost();
  host = startHost();
  await waitForApp("restarted published app");
  assertSingleDotnetTree(host.pid);
  const afterRestart = await httpJson(`${base}/api/demos/${id}`);
  assert(afterRestart.status === 200 && afterRestart.json?.id === id, "demo did not persist across restart");
  const afterRestartNote = await httpJson(`${base}/api/notes/${noteId}`);
  assert(afterRestartNote.status === 200, `note did not persist across restart: ${afterRestartNote.status}`);
  assert(afterRestartNote.json?.id === noteId && afterRestartNote.json?.title === noteTitle, "restarted note mismatch");

  const deleted = await fetch(`${base}/api/demos/${id}`, { method: "DELETE" });
  assert(deleted.status === 204, `DELETE returned ${deleted.status}`);
  const gone = await httpJson(`${base}/api/demos/${id}`);
  assert(gone.status === 404, `deleted demo returned ${gone.status}`);

  console.log(`Release smoke OK: static, assets, API CRUD, JSON 404, pagination 400, restart persistence (${base}, PID ${host.pid}).`);
} catch (error) {
  exitCode = 1;
  console.error(`Release smoke FAILED: ${error.message}`);
} finally {
  await stopHost();
  for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
}

process.exit(exitCode);
