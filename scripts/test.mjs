// 文件职责：编排静态检查、五个后端测试项目、前端单元测试、Playwright 浏览器测试与备份恢复，发布验收改为 API 进程加 SvelteKit Node 进程，并汇总每项返回码与通过数量。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assert,
  assertSingleDotnetTree,
  httpJson,
  killOwnedTree,
  pnpmRunner,
  reserveLoopbackPort,
  root,
  runLogged,
  sleep,
  startKitServer,
  startProcess,
  waitForHttp,
} from "./lib.mjs";

const artifacts = resolve(root, "artifacts");
const publish = resolve(artifacts, "publish");
const db = resolve(artifacts, "test-e2e.db");
const requestedPort = Number(process.env.FSSO_TEST_PORT ?? 0);
const apiPort = requestedPort > 0 ? requestedPort : await reserveLoopbackPort();
const listenUrl = `http://127.0.0.1:${apiPort}`;
const pnpm = pnpmRunner();
const web = resolve(root, "web");
const trxDir = resolve(artifacts, "test-trx");
const originalTests = JSON.parse(readFileSync(resolve(root, "tests/original-test-names.json"), "utf8"));
mkdirSync(artifacts, { recursive: true });

const summary = [];
let host = null;
let kit = null;
let base = null;
let webOrigin = null;
let hostLog = "";
let exitCode = 0;

function record(label, result, extra = "") {
  const status = result.status ?? 1;
  const line = `${label}: RC=${status}${extra ? ` ${extra}` : ""}`;
  console.log(`\n== ${line}`);
  summary.push(line);
  if (status !== 0) exitCode = status || 1;
}

async function stopOwned(child) {
  if (!child) return;
  const pid = child.pid;
  await killOwnedTree(pid);
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(5_000)]);
}

async function stopHost() {
  await stopOwned(kit);
  kit = null;
  await stopOwned(host);
  host = null;
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

function parseTrx(file) {
  assert(existsSync(file), `TRX missing: ${file}`);
  const text = readFileSync(file, "utf8");
  const names = [...text.matchAll(/<UnitTestResult[^>]*testName="([^"]*)"/g)].map((match) => match[1]);
  const counterMatch = text.match(/<Counters[^>]*>/);
  assert(counterMatch, `TRX counters missing: ${file}`);
  const counters = counterMatch[0];
  const attr = (name) => Number((counters.match(new RegExp(`${name}="(\\d+)"`)) ?? [])[1]);
  return { names, total: attr("total"), executed: attr("executed"), passed: attr("passed"), failed: attr("failed") };
}

function runDotnetProject(label, project, expectedNames) {
  const trxName = `${label.replaceAll(" ", "-")}.trx`;
  const trxPath = resolve(trxDir, trxName);
  rmSync(trxPath, { force: true });
  const result = runLogged(
    label,
    "dotnet",
    ["test", project, "--logger", `trx;LogFileName=${trxName}`, "--results-directory", trxDir],
    {
      logFile: resolve(artifacts, `test-${label.replaceAll(" ", "-")}.log`),
      env: { ...process.env, DOTNET_CLI_UI_LANGUAGE: "en" },
    }
  );
  const trx = parseTrx(trxPath);
  record(label, result, `passed=${trx.passed} failed=${trx.failed} total=${trx.total}`);
  if (exitCode !== 0) throw new Error(`${label} failed`);
  assert(trx.failed === 0 && trx.passed === trx.total, `${label} has failed/skipped tests: ${JSON.stringify(trx)}`);
  if (expectedNames) {
    const expected = expectedNames.slice().sort();
    const actual = trx.names.slice().sort();
    assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${label} test names changed: expected ${expected.length}, got ${actual.length}`
    );
  }
  return trx;
}

try {
  record(
    "brand check",
    runLogged("brand check", process.execPath, [resolve(root, "scripts/brand-check.mjs")], {
      logFile: resolve(artifacts, "test-brand-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("brand check failed");

  record(
    "structure check",
    runLogged("structure check", process.execPath, [resolve(root, "scripts/structure-check.mjs")], {
      logFile: resolve(artifacts, "test-structure-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("structure check failed");

  record(
    "MediatR check",
    runLogged("MediatR check", process.execPath, [resolve(root, "scripts/check-mediatr.mjs")], {
      logFile: resolve(artifacts, "test-mediatr-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("MediatR check failed");

  record(
    "contract check",
    runLogged("contract check", process.execPath, [resolve(root, "scripts/contract-check.mjs")], {
      logFile: resolve(artifacts, "test-contract-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("contract check failed");

  record(
    "architecture check",
    runLogged("architecture check", process.execPath, [resolve(root, "scripts/architecture-check.mjs")], {
      logFile: resolve(artifacts, "test-architecture-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("architecture check failed");

  record(
    "demo contract check",
    runLogged("demo contract check", process.execPath, [resolve(root, "scripts/demo-contract-check.mjs")], {
      logFile: resolve(artifacts, "test-demo-contract-check.log"),
    })
  );
  if (exitCode !== 0) throw new Error("demo contract check failed");

  record(
    "build/publish",
    runLogged("build/publish", process.execPath, [resolve(root, "scripts/build.mjs")], {
      logFile: resolve(artifacts, "test-build.log"),
    })
  );
  if (exitCode !== 0) throw new Error("build/publish failed");

  record(
    "negative control",
    runLogged("negative control", process.execPath, [resolve(root, "scripts/negative-control.mjs")], {
      logFile: resolve(artifacts, "test-negative-control.log"),
    })
  );
  if (exitCode !== 0) throw new Error("negative control failed");

  rmSync(trxDir, { recursive: true, force: true });
  mkdirSync(trxDir, { recursive: true });

  const originalCounts = [];
  for (const assembly of originalTests.assemblies) {
    const trx = runDotnetProject(assembly.assembly, assembly.project, assembly.tests);
    originalCounts.push(`${assembly.assembly}=${trx.passed}`);
    assert(trx.passed === assembly.count, `${assembly.assembly} expected ${assembly.count}, got ${trx.passed}`);
  }
  const cqrs = runDotnetProject(
    "Fsso.Cqrs.Tests",
    "tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj",
    null
  );
  assert(cqrs.passed === 13, `Fsso.Cqrs.Tests expected 13, got ${cqrs.passed}`);
  record(
    "original test retention",
    { status: 0, output: "" },
    `originals=${originalCounts.join(",")} total=${originalTests.assemblies.reduce((sum, item) => sum + item.count, 0)} cqrs=${cqrs.passed}`
  );

  const notesNames = [
    "Fsso.Notes.Tests.NotesTests.CreateAndGetNoteHttpRoundTripPersistsInSqlite",
    "Fsso.Notes.Tests.NotesTests.ValidationAndMissingIdReturnUniformErrors",
    "Fsso.Notes.Tests.NotesTests.MigrationAddsNotesTableAndKeepsDemoMigrationVersions",
    "Fsso.Notes.Tests.NotesTests.RestartPersistenceReadsNoteCreatedBeforeRestart",
    "Fsso.Notes.Tests.TransactionTests.CrossModuleCommitWritesDemoAndNote",
    "Fsso.Notes.Tests.TransactionTests.CrossModuleErrorRollsBackDemoAndNote",
    "Fsso.Notes.Tests.TransactionTests.CrossModuleExceptionRollsBackDemoAndNote",
    "Fsso.Notes.Tests.TransactionTests.CrossModuleCancellationRollsBackDemoAndNote",
  ];
  const notes = runDotnetProject(
    "Fsso.Notes.Tests",
    "tests/Notes.Tests/Fsso.Notes.Tests.fsproj",
    notesNames
  );
  assert(notes.passed === 8, `Fsso.Notes.Tests expected 8, got ${notes.passed}`);
  record("Notes test retention", { status: 0, output: "" }, `notes=${notes.passed}`);

  record(
    "backup/restore",
    runLogged("backup/restore", process.execPath, [resolve(root, "scripts/sqlite-backup-check.mjs")], {
      logFile: resolve(artifacts, "test-backup-restore.log"),
    })
  );
  if (exitCode !== 0) throw new Error("SQLite backup/restore check failed");

  const sync = runLogged(
    "svelte-kit sync",
    process.execPath,
    [resolve(root, "node_modules/@sveltejs/kit/svelte-kit.js"), "sync"],
    { cwd: web, logFile: resolve(artifacts, "test-svelte-kit-sync.log") }
  );
  if (sync.status !== 0) throw new Error("svelte-kit sync failed");
  record(
    "frontend check",
    runLogged(
      "frontend check",
      process.execPath,
      [resolve(root, "node_modules/svelte-check/bin/svelte-check"), "--tsconfig", "tsconfig.json"],
      { cwd: web, logFile: resolve(artifacts, "test-frontend-check.log") }
    )
  );
  if (exitCode !== 0) throw new Error("frontend check failed");

  const unit = runLogged(
    "frontend unit",
    process.execPath,
    [resolve(root, "node_modules/vitest/vitest.mjs"), "run", "src"],
    { cwd: web, logFile: resolve(artifacts, "test-frontend-unit.log") }
  );
  const unitCounts = unit.output.match(/Tests\s+(\d+)\s+passed/);
  record("frontend unit", unit, unitCounts ? `passed=${unitCounts[1]}` : "counts-unparsed");
  if (exitCode !== 0) throw new Error("frontend unit tests failed");
  if (!unitCounts) throw new Error("frontend unit counts could not be parsed");
  if (Number(unitCounts[1]) !== 5) throw new Error(`frontend unit expected passed=5, got ${unitCounts[1]}`);

  assert(existsSync(resolve(publish, "Fsso.Host.dll")), "published DLL missing after build");
  for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
  base = null;
  hostLog = "";
  host = startProcess("host", "dotnet", [resolve(publish, "Fsso.Host.dll")], {
    cwd: publish,
    logFile: resolve(artifacts, "test-host.log"),
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
  await waitForApp("published API");
  assertSingleDotnetTree(host.pid);
  const apiPage = await httpJson(`${base}/`);
  assert(apiPage.status === 404, `API process served a page: HTTP ${apiPage.status}`);
  const kitPort = await reserveLoopbackPort();
  const started = startKitServer("web", {
    port: kitPort,
    apiOrigin: base,
    logFile: resolve(artifacts, "test-web.log"),
  });
  kit = started.child;
  webOrigin = started.origin;
  await waitForHttp(`${webOrigin}/`, { child: kit, label: "published SvelteKit" });
  const page = await httpJson(`${webOrigin}/`);
  assert(page.status === 200 && page.text.includes("FSSO Stack"), "published SvelteKit page did not render");
  const proxied = await httpJson(`${webOrigin}/api/health`);
  assert(proxied.status === 200 && proxied.json?.status === "ok", "published SvelteKit proxy failed");

  const note = await httpJson(`${base}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: `Published note ${Date.now()}`, body: "published notes smoke" }),
  });
  assert(note.status === 201, `published POST /api/notes returned ${note.status}: ${note.text}`);
  const noteId = note.json?.id;
  assert(typeof noteId === "string" && noteId.length > 0, "published note create has no id");
  const fetchedNote = await httpJson(`${base}/api/notes/${noteId}`);
  assert(fetchedNote.status === 200 && fetchedNote.json?.id === noteId, "published GET /api/notes/{id} failed");
  record("published Notes API", { status: 0, output: "" }, `create=201 get=200 id=${noteId}`);

  const playwright = runLogged(
    "playwright",
    pnpm.command,
    [...pnpm.prefix, "exec", "playwright", "test", "--config", "web/playwright.config.ts", "web/e2e/demo.spec.ts"],
    {
      logFile: resolve(artifacts, "test-playwright.log"),
      env: { ...process.env, BASE_URL: webOrigin },
    }
  );
  const pwCounts = playwright.output.match(/(\d+)\s+passed/);
  record("playwright", playwright, pwCounts ? `passed=${pwCounts[1]} baseUrl=${base}` : "counts-unparsed");
  if (exitCode !== 0) throw new Error("Playwright failed");
  if (!pwCounts) throw new Error("Playwright counts could not be parsed");
  if (Number(pwCounts[1]) !== 5) throw new Error(`Playwright expected passed=5, got ${pwCounts[1]}`);

  console.log("\nAll test stages passed.");
} catch (error) {
  exitCode = exitCode || 1;
  console.error(`\nTest run FAILED: ${error.message}`);
  summary.push(`FAILED: ${error.message}`);
} finally {
  await stopHost();
  for (const suffix of ["", "-shm", "-wal"]) rmSync(`${db}${suffix}`, { force: true });
  writeFileSync(resolve(artifacts, "test-summary.log"), `${summary.join("\n")}\nexit=${exitCode}\n`);
  console.log(`\n${summary.join("\n")}`);
}

process.exit(exitCode);
