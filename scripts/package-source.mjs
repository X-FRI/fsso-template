// 文件职责：要求 git 工作树干净后归档 HEAD，解压到独立目录并执行安装、检查、构建、测试、契约、备份、浏览器与重启验收，最后输出包哈希和证据摘要；本任务仅添加首部注释，运行逻辑与常量保持原样。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, relative, resolve, sep } from "node:path";
import {
  assert,
  assertReportGates,
  assertSingleDotnetTree,
  httpJson,
  killOwnedTree,
  pnpmRunner,
  root,
  runLogged,
  sha,
  sleep,
  startProcess,
  waitForHttp,
} from "./lib.mjs";

const artifacts = resolve(root, "artifacts");
const archive = process.env.FSSO_ARCHIVE_PATH
  ? resolve(root, process.env.FSSO_ARCHIVE_PATH)
  : resolve(artifacts, "fsso-modular-source-v2.tar.gz");
const scratchBase = process.env.FSSO_SCRATCH
  ? resolve(process.env.FSSO_SCRATCH)
  : resolve(root, "artifacts/independence");
const sourceSha = sha();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runId = `${sourceSha}-${timestamp}-${process.pid}`;
const runDirectory = resolve(artifacts, "final", `package-${runId}`);
function stageLog(name) {
  return resolve(runDirectory, `${name}.log`);
}
const summaryFile = resolve(runDirectory, "package-source-summary.log");
const extracted = resolve(scratchBase, `independent-${sourceSha}-${timestamp}-${process.pid}`);
const required = [
  "README.md",
  "README_zh.md",
  "package.json",
  "pnpm-lock.yaml",
  "FssoStack.slnx",
  "Directory.Build.props",
  "sqlhydra.toml",
  "openapi/openapi.json",
  "web/index.html",
  "web/vite.config.ts",
  "web/src/App.svelte",
  "web/components.json",
  "web/openapi-ts.config.ts",
  "web/playwright.config.ts",
  "web/e2e/demo.spec.ts",
  "web/src/lib/demo-helpers.test.ts",
  "web/src/lib/components/ui/skeleton/skeleton.svelte",
  "web/src/lib/components/ui/skeleton/index.ts",
  "web/src/lib/api/generated/index.ts",
  "web/src/lib/api/generated/sdk.gen.ts",
  "web/src/lib/api/generated/types.gen.ts",
  "scripts/brand-check.mjs",
  "scripts/structure-check.mjs",
  "scripts/check-mediatr.mjs",
  "scripts/contract-check.mjs",
  "scripts/contract-hashes.json",
  "scripts/architecture-check.mjs",
  "scripts/demo-contract-check.mjs",
  "scripts/demo-contract.json",
  "scripts/demo-sdk-contract.json",
  "scripts/check.mjs",
  "scripts/test.mjs",
  "scripts/package-source.mjs",
  "scripts/release-smoke.mjs",
  "scripts/sqlite-backup-check.mjs",
  "scripts/build.mjs",
  "scripts/gen-openapi.mjs",
  "scripts/gen-sdk.mjs",
  "scripts/gen-sqlhydra.sh",
  "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  "src/Shared/Fsso.SharedKernel/Errors.fs",
  "src/Shared/Fsso.SharedKernel/UnitOfWork.fs",
  "src/Shared/Fsso.SharedKernel/Faults.fs",
  "src/Shared/Fsso.Database/Fsso.Database.fsproj",
  "src/Shared/Fsso.Database/Db.fs",
  "src/Shared/Fsso.Database/Migrations.fs",
  "src/Shared/Fsso.Database/Tables.fs",
  "src/Shared/Fsso.Database/Generated/SqlHydra.fs",
  "src/Shared/Fsso.Api/Fsso.Api.fsproj",
  "src/Shared/Fsso.Api/SharedDtos.fs",
  "src/Shared/Fsso.Api/HttpResults.fs",
  "src/Shared/Fsso.Api/ModuleDescriptor.fs",
  "src/Shared/Fsso.Api/OpenApiSupport.fs",
  "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
  "src/Modules/Demo/Domain/Demo.fs",
  "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
  "src/Modules/Demo/Application/Ports.fs",
  "src/Modules/Demo/Application/Commands/CreateDemoCommand.fs",
  "src/Modules/Demo/Application/Commands/DeleteDemoCommand.fs",
  "src/Modules/Demo/Application/Queries/GetDemoQuery.fs",
  "src/Modules/Demo/Application/Queries/ListDemosQuery.fs",
  "src/Modules/Demo/Application/Handlers/CreateDemoHandler.fs",
  "src/Modules/Demo/Application/Handlers/GetDemoHandler.fs",
  "src/Modules/Demo/Application/Handlers/ListDemosHandler.fs",
  "src/Modules/Demo/Application/Handlers/DeleteDemoHandler.fs",
  "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
  "src/Modules/Demo/Infrastructure/DemoMigrations.fs",
  "src/Modules/Demo/Infrastructure/SqliteDemoStore.fs",
  "src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql",
  "src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql",
  "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
  "src/Modules/Demo/Api/DemoDtos.fs",
  "src/Modules/Demo/Api/DemoOpenApi.fs",
  "src/Modules/Demo/Api/DemoEndpoints.fs",
  "src/Modules/Demo/Api/DemoModule.fs",
  "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
  "src/Modules/Notes/Domain/Note.fs",
  "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
  "src/Modules/Notes/Application/Ports.fs",
  "src/Modules/Notes/Application/Commands/CreateNoteCommand.fs",
  "src/Modules/Notes/Application/Queries/GetNoteQuery.fs",
  "src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs",
  "src/Modules/Notes/Application/Handlers/GetNoteHandler.fs",
  "src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj",
  "src/Modules/Notes/Infrastructure/NotesMigrations.fs",
  "src/Modules/Notes/Infrastructure/SqliteNoteStore.fs",
  "src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql",
  "src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj",
  "src/Modules/Notes/Api/NoteDtos.fs",
  "src/Modules/Notes/Api/NoteEndpoints.fs",
  "src/Modules/Notes/Api/NotesModule.fs",
  "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
  "src/Composition/Fsso.Composition/SqliteWorkScope.fs",
  "src/Composition/Fsso.Composition/SqliteUnitOfWork.fs",
  "src/Composition/Fsso.Composition/Composition.fs",
  "src/Host/Fsso.Host.fsproj",
  "src/Host/Program.fs",
  "tests/Domain.Tests/Fsso.Domain.Tests.fsproj",
  "tests/Domain.Tests/Tests.fs",
  "tests/Application.Tests/Fsso.Application.Tests.fsproj",
  "tests/Application.Tests/Tests.fs",
  "tests/Integration.Tests/Fsso.Integration.Tests.fsproj",
  "tests/Integration.Tests/Support.fs",
  "tests/Integration.Tests/StoreTests.fs",
  "tests/Integration.Tests/HostTests.fs",
  "tests/Integration.Tests/OpenApiTests.fs",
  "tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj",
  "tests/Cqrs.Tests/Support.fs",
  "tests/Cqrs.Tests/Tests.fs",
  "tests/Notes.Tests/Fsso.Notes.Tests.fsproj",
  "tests/Notes.Tests/Support.fs",
  "tests/Notes.Tests/NotesTests.fs",
  "tests/Notes.Tests/TransactionTests.fs",
  "tests/original-test-names.json",
  "tests/demo-module-files.sha256",
  "docs/fsso-modular-spec.md",
  "docs/plans/2026-10-29-fsso-modular.md",
  "docs/reviews/fsso-modular-final-report.md",
  "docs/reviews/fsso-modular-review-log.md",
];
const forbidden = [
  /(^|\/)(\.git|\.tools|node_modules|\.pnpm-store|bin|obj|artifacts|wwwroot|apps)(\/|$)/,
  /(^|\/)pnpm-workspace\.yaml$/,
  /(^|\/)(package-lock\.json|yarn\.lock|npm-shrinkwrap\.json)$/,
  /(^|\/)(\.env|\.env\..*|.*\.db|.*\.db-shm|.*\.db-wal|.*\.log)$/,
  /(^|\/)(test-results|playwright-report|coverage|TestResults)(\/|$)/,
  /(^|\/)credentials[^/]*$/i,
];
const legacyToken = Buffer.from("Y2xpbndpc2U=", "base64").toString("latin1");
const summary = [];
let host = null;
let base = null;
let hostLog = "";
let exitCode = 0;

function posix(path) {
  return path.split(sep).join("/");
}

function record(label, status, extra = "") {
  const line = `${label}: RC=${status}${extra ? ` ${extra}` : ""}`;
  console.log(`\n== ${line}`);
  summary.push(line);
  if (status !== 0) exitCode = status || 1;
}

function hasLegacy(buffer) {
  const haystack = buffer.toString("latin1").toLowerCase();
  return haystack.includes(legacyToken);
}

function walkFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) walkFiles(absolute, files);
    else if (entry.isFile()) files.push(absolute);
    else if (entry.isSymbolicLink()) {
      try {
        if (statSync(absolute).isFile()) files.push(absolute);
      } catch {
        files.push(absolute);
      }
    }
  }
  return files;
}

function scanExtractedBrand(directory) {
  const failures = [];
  for (const file of walkFiles(directory)) {
    const relativePath = posix(relative(directory, file));
    if (hasLegacy(Buffer.from(relativePath, "utf8"))) {
      failures.push(`path ${relativePath}`);
      continue;
    }
    if (hasLegacy(readFileSync(file))) failures.push(`bytes ${relativePath}`);
  }
  return failures;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function stopHost() {
  if (!host) return;
  const pid = host.pid;
  await killOwnedTree(pid);
  await Promise.race([new Promise((resolve) => host.once("exit", resolve)), sleep(5_000)]);
  host = null;
}

async function waitForIndependent(label) {
  const deadline = Date.now() + 60_000;
  while (!base) {
    if (host.exitCode !== null) throw new Error(`${label} exited early with code ${host.exitCode}`);
    if (Date.now() > deadline) throw new Error(`${label} did not report a listening address`);
    await sleep(100);
  }
  await waitForHttp(`${base}/api/health`, { child: host, label });
}

function listeningUrl(text) {
  hostLog += text;
  const match = hostLog.match(/Now listening on:\s*(http:\/\/[^\s]+)/);
  if (match) base = match[1].replace(/\/+$/, "");
}

try {
  mkdirSync(artifacts, { recursive: true });
  if (existsSync(runDirectory)) throw new Error(`refusing to reuse packaging evidence directory ${runDirectory}`);
  mkdirSync(runDirectory, { recursive: true });
  if (existsSync(archive)) {
    throw new Error(`archive already exists; refusing to overwrite: ${archive}`);
  }
  if (existsSync(extracted)) {
    throw new Error(`refusing to reuse extraction path: ${extracted}`);
  }

  const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  assert(status.status === 0, "git status failed");
  assert(status.stdout.trim() === "", `working tree is not clean; commit complete source first:\n${status.stdout}`);
  console.log(`Packaging committed source SHA ${sourceSha}`);
  console.log(`Evidence directory: ${runDirectory}`);
  console.log(`Archive target: ${archive}`);
  console.log(`Extraction target: ${extracted}`);

  assertReportGates(root);
  record("report status gates", 0, "no unresolved placeholders; no premature COMPLETE while reviews are pending");

  const architecture = runLogged("architecture check", process.execPath, [resolve(root, "scripts/architecture-check.mjs")], {
    logFile: resolve(runDirectory, "package-architecture-check.log"),
  });
  record("architecture check", architecture.status);
  if (architecture.status !== 0) throw new Error("architecture check failed before packaging");

  const demoContract = runLogged("demo contract check", process.execPath, [resolve(root, "scripts/demo-contract-check.mjs")], {
    logFile: resolve(runDirectory, "package-demo-contract-check.log"),
  });
  record("demo contract check", demoContract.status);
  if (demoContract.status !== 0) throw new Error("demo contract check failed before packaging");

  execFileSync("git", ["archive", "HEAD", "-o", archive], { cwd: root, stdio: "inherit" });
  assert(existsSync(archive), "archive was not created");
  const archiveSha256 = sha256File(archive);
  record("git archive", 0, `${archive} sha256=${archiveSha256}`);

  const listing = spawnSync("tar", ["-tzf", archive], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert(listing.status === 0, "tar listing failed");
  const entries = listing.stdout.split("\n").filter(Boolean);
  for (const item of required) assert(entries.includes(item), `archive missing ${item}`);
  const bad = entries.filter((entry) => forbidden.some((pattern) => pattern.test(entry)));
  assert(bad.length === 0, `archive contains forbidden paths: ${bad.slice(0, 10).join(", ")}`);
  const legacyPaths = entries.filter((entry) => hasLegacy(Buffer.from(entry, "utf8")));
  assert(legacyPaths.length === 0, `archive contains legacy-brand paths: ${legacyPaths.slice(0, 10).join(", ")}`);
  record("archive assertions", 0, `${entries.length} entries; required present; forbidden absent; legacy paths=0`);

  mkdirSync(extracted, { recursive: true });
  const untar = spawnSync("tar", ["-xzf", archive, "-C", extracted], { encoding: "utf8" });
  assert(untar.status === 0, `extract failed: ${untar.stderr}`);
  record("extract", 0, extracted);

  assertReportGates(extracted);
  record("extracted report status gates", 0, "no unresolved placeholders; no premature COMPLETE while reviews are pending");

  const extractedBrand = scanExtractedBrand(extracted);
  assert(extractedBrand.length === 0, `extracted source contains legacy-brand paths/bytes: ${extractedBrand.slice(0, 10).join(", ")}`);
  record("extracted brand census", 0, `${walkFiles(extracted).length} files; legacy paths=0 bytes=0`);

  for (const file of readdirSync(resolve(extracted, "scripts")).filter((name) => name.endsWith(".mjs"))) {
    const contents = readFileSync(resolve(extracted, "scripts", file), "utf8");
    assert(!contents.includes(root), `scripts/${file} contains the original checkout path`);
  }
  record("path independence scan", 0, "no original checkout paths in scripts");

  const whichDotnet = spawnSync("which", ["dotnet"], { cwd: extracted, encoding: "utf8" });
  const dotnetVersion = spawnSync("dotnet", ["--version"], { cwd: extracted, encoding: "utf8" });
  assert(whichDotnet.status === 0 && dotnetVersion.status === 0, "dotnet unavailable");
  console.log(`which dotnet: ${whichDotnet.stdout.trim()}`);
  console.log(`dotnet --version: ${dotnetVersion.stdout.trim()}`);
  summary.push(`which dotnet: ${whichDotnet.stdout.trim()}`);
  summary.push(`dotnet --version: ${dotnetVersion.stdout.trim()}`);

  const pnpm = pnpmRunner();
  const install = runLogged("independent pnpm install", pnpm.command, [...pnpm.prefix, "install", "--frozen-lockfile"], {
    cwd: extracted,
    logFile: stageLog("independent-install"),
  });
  record("independent pnpm install", install.status);
  if (install.status !== 0) throw new Error("independent pnpm install failed");

  const check = runLogged("independent pnpm check", pnpm.command, [...pnpm.prefix, "check"], {
    cwd: extracted,
    logFile: stageLog("independent-check"),
  });
  record("independent pnpm check", check.status);
  if (check.status !== 0) throw new Error("independent pnpm check failed");

  const build = runLogged("independent pnpm build", pnpm.command, [...pnpm.prefix, "build"], {
    cwd: extracted,
    logFile: stageLog("independent-build"),
  });
  record("independent pnpm build", build.status);
  if (build.status !== 0) throw new Error("independent pnpm build failed");

  const test = runLogged("independent pnpm test", pnpm.command, [...pnpm.prefix, "test"], {
    cwd: extracted,
    logFile: stageLog("independent-test"),
    env: { ...process.env, TMPDIR: resolve(extracted, "artifacts/tmp") },
  });
  record("independent pnpm test", test.status);
  if (test.status !== 0) throw new Error("independent pnpm test failed");

  const testSummaryPath = resolve(extracted, "artifacts/test-summary.log");
  assert(existsSync(testSummaryPath), `independent test summary missing: ${testSummaryPath}`);
  const testSummary = readFileSync(testSummaryPath, "utf8");
  for (const expectedLine of [
    "brand check: RC=0",
    "structure check: RC=0",
    "MediatR check: RC=0",
    "contract check: RC=0",
    "architecture check: RC=0",
    "demo contract check: RC=0",
    "build/publish: RC=0",
    "negative control: RC=0",
    "Fsso.Domain.Tests: RC=0 passed=5",
    "Fsso.Application.Tests: RC=0 passed=6",
    "Fsso.Integration.Tests: RC=0 passed=20",
    "Fsso.Cqrs.Tests: RC=0 passed=13",
    "Fsso.Notes.Tests: RC=0 passed=8",
    "backup/restore: RC=0",
    "frontend check: RC=0",
    "frontend unit: RC=0 passed=5",
  ]) {
    assert(testSummary.includes(expectedLine), `independent test summary missing expected line: ${expectedLine}`);
  }
  const playback = testSummary.match(/playwright: RC=(\d+) passed=(\d+)/);
  assert(playback, "independent test summary is missing the Playwright result");
  assert(playback[1] === "0" && playback[2] === "5", `independent Playwright result is RC=${playback[1]} passed=${playback[2]}`);
  assert(!testSummary.includes("FAILED"), "independent test summary records a failure");
  record("independent test identities", 0, "31 originals + 13 CQRS + 8 Notes + frontend 5 + browser 5; backup/restore RC=0");

  const published = resolve(extracted, "artifacts/publish");
  const dll = resolve(published, "Fsso.Host.dll");
  assert(existsSync(dll), `independent published DLL missing: ${dll}`);
  assert(existsSync(resolve(published, "wwwroot/index.html")), "independent published index.html missing");

  const db = resolve(extracted, "artifacts/independent.db");
  const port = Number(process.env.FSSO_PACKAGE_PORT ?? 0);
  const listenUrl = `http://127.0.0.1:${Number.isInteger(port) ? port : 0}`;
  base = null;
  hostLog = "";
  host = startProcess("independent-host", "dotnet", [dll], {
    cwd: published,
    logFile: stageLog("independent-host"),
    onText: listeningUrl,
    env: {
      ...process.env,
      FSSO_DB_PATH: db,
      ASPNETCORE_URLS: listenUrl,
      ASPNETCORE_ENVIRONMENT: "Production",
      FSSO_FAULT_INJECTION: "0",
    },
  });
  await waitForIndependent("independent app");
  assertSingleDotnetTree(host.pid);

  const index = await fetch(`${base}/`);
  assert(index.status === 200 && (await index.text()).includes('<div id="app">'), "independent static index failed");
  const html = await (await fetch(`${base}/`)).text();
  const asset = html.match(/(?:src|href)="(\/assets\/[^"]+\.js)"/);
  assert(asset, "independent index lacks asset");
  assert((await fetch(`${base}${asset[1]}`)).status === 200, "independent asset failed");
  record("independent static/one-process", 0, `${base}; no child processes`);

  const ids = [];
  for (let index = 1; index <= 3; index += 1) {
    const created = await httpJson(`${base}/api/demos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `Independent demo ${index} ${Date.now()}`, description: "archive verification" }),
    });
    assert(created.status === 201, `independent create returned ${created.status}`);
    ids.push(created.json.id);
  }
  const list = await httpJson(`${base}/api/demos?page=1&limit=2`);
  assert(list.status === 200, `independent list returned ${list.status}`);
  assert(Array.isArray(list.json?.data) && list.json.data.length === 2, "pagination limit=2 did not return 2 rows");
  assert(list.json.total >= 3, "pagination total is < 3");
  const page2 = await httpJson(`${base}/api/demos?page=2&limit=2`);
  assert(page2.status === 200 && Array.isArray(page2.json?.data), "page 2 failed");
  const invalidPage = await httpJson(`${base}/api/demos?page=0`);
  assert(invalidPage.status === 400, `invalid page returned ${invalidPage.status}`);
  const missing = await httpJson(`${base}/api/demos/not-a-guid`);
  assert(missing.status === 400, `invalid id returned ${missing.status}`);
  const unknown = await httpJson(`${base}/api/unknown`);
  assert(unknown.status === 404, `unknown API returned ${unknown.status}`);
  assert((unknown.response.headers.get("content-type") ?? "").includes("application/json"), "unknown API not JSON");
  assert(!unknown.text.includes("<html"), "unknown API fell back to HTML");

  const noteTitle = `Independent note ${Date.now()}`;
  const note = await httpJson(`${base}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: noteTitle, body: "archive notes verification" }),
  });
  assert(note.status === 201, `independent note create returned ${note.status}: ${note.text}`);
  assert(typeof note.json?.id === "string" && note.json.id.length > 0, "independent note create has no id");
  assert(note.response.headers.get("location") === `/api/notes/${note.json.id}`, "independent note Location header mismatch");
  const noteId = note.json.id;
  const fetchedNote = await httpJson(`${base}/api/notes/${noteId}`);
  assert(fetchedNote.status === 200, `independent note get returned ${fetchedNote.status}: ${fetchedNote.text}`);
  assert(fetchedNote.json?.id === noteId && fetchedNote.json?.title === noteTitle, "independent note get mismatch");
  record("independent API create/list/400/404/pagination + Notes create/get", 0, `demos=${ids.length} note=${noteId}`);

  await stopHost();
  base = null;
  hostLog = "";
  host = startProcess("independent-host-restart", "dotnet", [dll], {
    cwd: published,
    logFile: stageLog("independent-host-restart"),
    onText: listeningUrl,
    env: {
      ...process.env,
      FSSO_DB_PATH: db,
      ASPNETCORE_URLS: listenUrl,
      ASPNETCORE_ENVIRONMENT: "Production",
    },
  });
  await waitForIndependent("independent restarted app");
  assertSingleDotnetTree(host.pid);
  const persisted = await httpJson(`${base}/api/demos/${ids[0]}`);
  assert(persisted.status === 200 && persisted.json?.id === ids[0], "independent restart Demo persistence failed");
  const persistedNote = await httpJson(`${base}/api/notes/${noteId}`);
  assert(persistedNote.status === 200, `independent restart Notes persistence returned ${persistedNote.status}`);
  assert(persistedNote.json?.id === noteId && persistedNote.json?.title === noteTitle, "independent restart Notes persistence failed");
  record("independent restart persistence", 0, `demo=${ids[0]} note=${noteId}`);

  summary.push(`source SHA: ${sourceSha}`);
  summary.push(`archive: ${archive}`);
  summary.push(`archive SHA256: ${archiveSha256}`);
  summary.push(`archive entries: ${entries.length}`);
  summary.push(`extraction: ${extracted}`);
  summary.push(`evidence directory: ${runDirectory}`);
} catch (error) {
  exitCode = exitCode || 1;
  console.error(`Package/independence FAILED: ${error.message}`);
  summary.push(`FAILED: ${error.message}`);
} finally {
  await stopHost();
  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(summaryFile, `${summary.join("\n")}\nexit=${exitCode}\n`);
  console.log(`\n${summary.join("\n")}`);
}

process.exit(exitCode);
