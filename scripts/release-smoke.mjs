// 文件职责：对已发布的 API 与 SvelteKit Node 进程验证健康检查、同域代理、Demo 与 Notes 的创建读取删除和重启持久化，确认 Host 不再返回页面。
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  assert,
  assertSingleDotnetTree,
  httpJson,
  killOwnedTree,
  reserveLoopbackPort,
  root,
  sleep,
  startKitServer,
  startProcess,
  waitForHttp,
} from "./lib.mjs";

const publish = resolve(root, "artifacts/publish");
const dll = resolve(publish, "Fsso.Host.dll");
const db = resolve(root, "artifacts/release-smoke.db");
const kitBuild = resolve(root, "web/build/index.js");
const logFile = resolve(root, "artifacts/release-smoke.log");

assert(existsSync(dll), `published DLL missing: ${dll} (run pnpm build first)`);
assert(existsSync(kitBuild), `SvelteKit build missing: ${kitBuild} (run pnpm build first)`);
for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
mkdirSync(resolve(root, "artifacts"), { recursive: true });

const requestedPort = Number(process.env.FSSO_RELEASE_PORT ?? 0);
const apiPort = requestedPort > 0 ? requestedPort : await reserveLoopbackPort();
const listenUrl = `http://127.0.0.1:${apiPort}`;
const kitPort = await reserveLoopbackPort();

let host = null;
let kit = null;
let base = listenUrl;
let webOrigin = null;
let exitCode = 0;

function startHost() {
  return startProcess("host", "dotnet", [dll], {
    cwd: publish,
    logFile,
    env: {
      ...process.env,
      FSSO_DB_PATH: db,
      ASPNETCORE_URLS: listenUrl,
      ASPNETCORE_ENVIRONMENT: "Production",
      FSSO_FAULT_INJECTION: "0",
    },
  });
}

function startWeb() {
  const started = startKitServer("web", {
    port: kitPort,
    apiOrigin: listenUrl,
    logFile: resolve(root, "artifacts/release-smoke-web.log"),
  });
  webOrigin = started.origin;
  return started.child;
}

async function waitForApp(label) {
  const deadline = Date.now() + 60_000;
  while (host.exitCode === null && Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // keep waiting until the Host answers or the deadline expires
    }
    await sleep(100);
  }
  if (host.exitCode !== null) throw new Error(`${label} exited early with code ${host.exitCode}`);
  throw new Error(`${label} did not become ready`);
}

async function stopOwned(child) {
  if (!child) return;
  const pid = child.pid;
  await killOwnedTree(pid);
  await Promise.race([new Promise((resolveStop) => child.once("exit", resolveStop)), sleep(5_000)]);
}

async function stopAll() {
  await stopOwned(kit);
  kit = null;
  await stopOwned(host);
  host = null;
}

try {
  host = startHost();
  await waitForApp("published API");
  assertSingleDotnetTree(host.pid);
  kit = startWeb();
  await waitForHttp(`${webOrigin}/`, { child: kit, label: "published SvelteKit" });
  console.log(`Two processes verified: API PID ${host.pid}, SvelteKit PID ${kit.pid}.`);

  const apiPage = await httpJson(`${base}/`);
  assert(apiPage.status === 404, `API process returned HTTP ${apiPage.status} for /`);

  const index = await fetch(`${webOrigin}/`);
  assert(index.status === 200, `GET / returned ${index.status}`);
  assert((index.headers.get("content-type") ?? "").includes("text/html"), "GET / is not HTML");
  const html = await index.text();
  assert(html.includes("FSSO Stack"), "GET / did not render the SvelteKit page");
  assert(html.includes("/_app/"), "SvelteKit page has no client module");

  const assetMatch = html.match(/((?:\/_app\/[^"']+\.js))/);
  assert(assetMatch, "index has no SvelteKit client script");
  const asset = await fetch(`${webOrigin}${assetMatch[1]}`);
  const assetType = asset.headers.get("content-type") ?? "";
  assert(asset.status === 200, `GET ${assetMatch[1]} returned ${asset.status}`);
  assert(assetType.includes("javascript"), `asset content-type is ${assetType}`);

  const health = await httpJson(`${webOrigin}/api/health`);
  assert(health.status === 200 && health.json?.status === "ok", "proxied health endpoint failed");

  const unknown = await httpJson(`${webOrigin}/api/unknown`);
  assert(unknown.status === 404, `unknown API returned ${unknown.status}`);
  assert((unknown.response.headers.get("content-type") ?? "").includes("application/json"), "unknown API is not JSON");
  assert(
    JSON.stringify(Object.keys(unknown.json ?? {}).sort()) ===
      JSON.stringify(["code", "message", "statusCode", "traceId"]),
    `unknown API body is not ErrorResponse: ${unknown.text}`
  );
  assert(!unknown.text.includes("<!doctype html>") && !unknown.text.includes("<html"), "unknown API fell back to HTML");

  const created = await httpJson(`${webOrigin}/api/demos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Release Smoke ${Date.now()}`, description: "release smoke" }),
  });
  assert(created.status === 201, `POST /api/demos returned ${created.status}: ${created.text}`);
  const id = created.json?.id;
  assert(typeof id === "string" && id.length > 0, "created demo has no id");

  const listed = await httpJson(`${webOrigin}/api/demos?page=1&limit=10`);
  assert(listed.status === 200, `GET list returned ${listed.status}`);
  assert(Array.isArray(listed.json?.data) && listed.json.data.some((item) => item.id === id), "created demo not listed");
  assert(listed.json.total >= 1, "list total is not >= 1");

  const badPage = await httpJson(`${webOrigin}/api/demos?page=0`);
  assert(badPage.status === 400, `invalid pagination returned ${badPage.status}`);
  assert((badPage.response.headers.get("content-type") ?? "").includes("application/json"), "400 is not JSON");

  const fetched = await httpJson(`${webOrigin}/api/demos/${id}`);
  assert(fetched.status === 200 && fetched.json?.id === id, "GET detail failed");

  const noteTitle = `Release Smoke Note ${Date.now()}`;
  const note = await httpJson(`${webOrigin}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: noteTitle, body: "release smoke note" }),
  });
  assert(note.status === 201, `POST /api/notes returned ${note.status}: ${note.text}`);
  assert(typeof note.json?.id === "string" && note.json.id.length > 0, "created note has no id");
  const noteId = note.json.id;
  const fetchedNote = await httpJson(`${webOrigin}/api/notes/${noteId}`);
  assert(fetchedNote.status === 200, `GET /api/notes/{id} returned ${fetchedNote.status}`);
  assert(fetchedNote.json?.id === noteId && fetchedNote.json?.title === noteTitle, "GET note mismatch");

  await stopOwned(host);
  host = null;
  host = startHost();
  await waitForApp("restarted published API");
  assertSingleDotnetTree(host.pid);
  const afterRestart = await httpJson(`${webOrigin}/api/demos/${id}`);
  assert(afterRestart.status === 200 && afterRestart.json?.id === id, "demo did not persist across restart");
  const afterRestartNote = await httpJson(`${webOrigin}/api/notes/${noteId}`);
  assert(afterRestartNote.status === 200, `note did not persist across restart: ${afterRestartNote.status}`);
  assert(afterRestartNote.json?.id === noteId && afterRestartNote.json?.title === noteTitle, "restarted note mismatch");

  const deleted = await fetch(`${webOrigin}/api/demos/${id}`, { method: "DELETE" });
  assert(deleted.status === 204, `DELETE returned ${deleted.status}`);
  const gone = await httpJson(`${webOrigin}/api/demos/${id}`);
  assert(gone.status === 404, `deleted demo returned ${gone.status}`);

  console.log(`Release smoke OK: SvelteKit page, proxied API CRUD, JSON 404, pagination 400, restart persistence (${webOrigin} -> ${base}).`);
} catch (error) {
  exitCode = 1;
  console.error(`Release smoke FAILED: ${error.message}`);
} finally {
  await stopAll();
  for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
}

process.exit(exitCode);
