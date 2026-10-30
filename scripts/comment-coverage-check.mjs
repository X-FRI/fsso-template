// 文件职责：解析 docs/comment-inventory.zh.md，校验基线 186 路径与新增交付并集、A 类职责标记、B 类冻结理由、派生 manifest 旧新哈希、重复职责句和负控；在无 .git 解包环境改用内嵌基线与文件系统存在性检查，只读运行且不修改源码。
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function isRepoRoot() {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return realpathSync(top) === realpathSync(root);
  } catch {
    return false;
  }
}
const INVENTORY = "docs/comment-inventory.zh.md";
const BASELINE = "bf647e31f1cd0395d784d90935f37d7e56d27b80";
const BASELINE_MANIFEST = "docs/evidence/demo-module-files.baseline.bf647e31.sha256";
const CURRENT_MANIFEST = "tests/demo-module-files.sha256";
const BASELINE_MANIFEST_SHA = "801701bbce1c86208a527301d5b53f5063f6c6ec9f93e72f9b851d19d7cfb201";
const EQUIVALENCE_INDEX = "docs/evidence/comment-equivalence-baseline.bf647e31.json";
const MARKER = "文件职责：";
const NEW_FILES = [
  "docs/comment-standard-spec.zh.md",
  "docs/plans/2026-10-29-comment-coverage.zh.md",
  "docs/comment-inventory.zh.md",
  "scripts/comment-coverage-check.mjs",
  "scripts/comment-equivalence-check.mjs",
  "docs/evidence/demo-module-files.baseline.bf647e31.sha256",
  "docs/evidence/comment-equivalence-baseline.bf647e31.json",
  "docs/architecture-guide.zh.md",
];
const PENDING_NEW = new Set(["docs/architecture-guide.zh.md"]);
const SKIP_DIRS = new Set([
  ".git",
  ".tools",
  ".tmp",
  "node_modules",
  ".pnpm-store",
  "artifacts",
  "bin",
  "obj",
  "test-results",
  "playwright-report",
  "coverage",
  "data",
  "dist",
  "wwwroot",
]);
const BASELINE_PATHS = `.config/dotnet-tools.json
.gitignore
Directory.Build.props
FssoStack.slnx
README.md
README_zh.md
docs/design.md
docs/evidence/baseline-backend-test-identities.json
docs/fsso-modular-spec.md
docs/fsso-stack-spec.md
docs/ledger.md
docs/plans/2026-10-28-pre-fsso-starter.md
docs/plans/2026-10-29-fsso-modular.md
docs/plans/2026-10-29-fsso-stack.md
docs/reviews/final-report.md
docs/reviews/fsso-final-report.md
docs/reviews/fsso-modular-final-report.md
docs/reviews/fsso-modular-review-log.md
docs/reviews/fsso-modular-task1-implementer.md
docs/reviews/fsso-modular-task2-implementer.md
docs/reviews/fsso-shadcn-generator.md
docs/reviews/fsso-task-1-implementer.md
docs/reviews/fsso-task-2-implementer.md
docs/reviews/fsso-task-3-implementer.md
docs/reviews/task-1-implementer.md
docs/reviews/task-2-implementer.md
docs/reviews/task-3-implementer.md
openapi/openapi.json
package.json
pnpm-lock.yaml
scripts/architecture-check.mjs
scripts/brand-check.mjs
scripts/build.mjs
scripts/check-mediatr.mjs
scripts/check.mjs
scripts/contract-check.mjs
scripts/contract-hashes.json
scripts/demo-contract-check.mjs
scripts/demo-contract.json
scripts/demo-sdk-contract.json
scripts/dev.mjs
scripts/gen-openapi.mjs
scripts/gen-sdk.mjs
scripts/gen-sqlhydra.sh
scripts/lib.mjs
scripts/negative-control.mjs
scripts/package-source.mjs
scripts/release-smoke.mjs
scripts/shadcn-add.mjs
scripts/sqlite-backup-check.mjs
scripts/store-registration-negative.mjs
scripts/structure-check.mjs
scripts/test.mjs
sqlhydra.toml
src/Composition/Fsso.Composition/Composition.fs
src/Composition/Fsso.Composition/Fsso.Composition.fsproj
src/Composition/Fsso.Composition/SqliteUnitOfWork.fs
src/Composition/Fsso.Composition/SqliteWorkScope.fs
src/Host/Fsso.Host.fsproj
src/Host/Program.fs
src/Modules/Demo/Api/DemoDtos.fs
src/Modules/Demo/Api/DemoEndpoints.fs
src/Modules/Demo/Api/DemoModule.fs
src/Modules/Demo/Api/DemoOpenApi.fs
src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj
src/Modules/Demo/Application/Commands/CreateDemoCommand.fs
src/Modules/Demo/Application/Commands/DeleteDemoCommand.fs
src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj
src/Modules/Demo/Application/Handlers/CreateDemoHandler.fs
src/Modules/Demo/Application/Handlers/DeleteDemoHandler.fs
src/Modules/Demo/Application/Handlers/GetDemoHandler.fs
src/Modules/Demo/Application/Handlers/ListDemosHandler.fs
src/Modules/Demo/Application/Ports.fs
src/Modules/Demo/Application/Queries/GetDemoQuery.fs
src/Modules/Demo/Application/Queries/ListDemosQuery.fs
src/Modules/Demo/Domain/Demo.fs
src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj
src/Modules/Demo/Infrastructure/DemoMigrations.fs
src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj
src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql
src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql
src/Modules/Demo/Infrastructure/SqliteDemoStore.fs
src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj
src/Modules/Notes/Api/NoteDtos.fs
src/Modules/Notes/Api/NoteEndpoints.fs
src/Modules/Notes/Api/NotesModule.fs
src/Modules/Notes/Application/Commands/CreateNoteCommand.fs
src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj
src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs
src/Modules/Notes/Application/Handlers/GetNoteHandler.fs
src/Modules/Notes/Application/Ports.fs
src/Modules/Notes/Application/Queries/GetNoteQuery.fs
src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj
src/Modules/Notes/Domain/Note.fs
src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj
src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql
src/Modules/Notes/Infrastructure/NotesMigrations.fs
src/Modules/Notes/Infrastructure/SqliteNoteStore.fs
src/Shared/Fsso.Api/Fsso.Api.fsproj
src/Shared/Fsso.Api/HttpResults.fs
src/Shared/Fsso.Api/ModuleDescriptor.fs
src/Shared/Fsso.Api/OpenApiSupport.fs
src/Shared/Fsso.Api/SharedDtos.fs
src/Shared/Fsso.Database/Db.fs
src/Shared/Fsso.Database/Fsso.Database.fsproj
src/Shared/Fsso.Database/Generated/SqlHydra.fs
src/Shared/Fsso.Database/Migrations.fs
src/Shared/Fsso.Database/Tables.fs
src/Shared/Fsso.SharedKernel/Errors.fs
src/Shared/Fsso.SharedKernel/Faults.fs
src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj
src/Shared/Fsso.SharedKernel/UnitOfWork.fs
tests/Application.Tests/Fsso.Application.Tests.fsproj
tests/Application.Tests/Tests.fs
tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj
tests/Cqrs.Tests/Support.fs
tests/Cqrs.Tests/Tests.fs
tests/Domain.Tests/Fsso.Domain.Tests.fsproj
tests/Domain.Tests/Tests.fs
tests/Integration.Tests/Fsso.Integration.Tests.fsproj
tests/Integration.Tests/HostTests.fs
tests/Integration.Tests/OpenApiTests.fs
tests/Integration.Tests/StoreTests.fs
tests/Integration.Tests/Support.fs
tests/Notes.Tests/Fsso.Notes.Tests.fsproj
tests/Notes.Tests/NotesTests.fs
tests/Notes.Tests/Support.fs
tests/Notes.Tests/TransactionTests.fs
tests/demo-module-files.sha256
tests/original-test-names.json
web/components.json
web/e2e/demo.spec.ts
web/e2e/start-backend.mjs
web/e2e/start-frontend.mjs
web/index.html
web/openapi-ts.config.ts
web/playwright.config.ts
web/postcss.config.js
web/src/App.svelte
web/src/app.css
web/src/lib/api/client.ts
web/src/lib/api/generated/client.gen.ts
web/src/lib/api/generated/client/client.gen.ts
web/src/lib/api/generated/client/index.ts
web/src/lib/api/generated/client/types.gen.ts
web/src/lib/api/generated/client/utils.gen.ts
web/src/lib/api/generated/core/auth.gen.ts
web/src/lib/api/generated/core/bodySerializer.gen.ts
web/src/lib/api/generated/core/params.gen.ts
web/src/lib/api/generated/core/pathSerializer.gen.ts
web/src/lib/api/generated/core/queryKeySerializer.gen.ts
web/src/lib/api/generated/core/serverSentEvents.gen.ts
web/src/lib/api/generated/core/types.gen.ts
web/src/lib/api/generated/core/utils.gen.ts
web/src/lib/api/generated/index.ts
web/src/lib/api/generated/sdk.gen.ts
web/src/lib/api/generated/types.gen.ts
web/src/lib/api/index.ts
web/src/lib/components/ui/alert-dialog/alert-dialog.svelte
web/src/lib/components/ui/alert-dialog/index.ts
web/src/lib/components/ui/badge/badge.svelte
web/src/lib/components/ui/badge/index.ts
web/src/lib/components/ui/button/button.svelte
web/src/lib/components/ui/button/index.ts
web/src/lib/components/ui/card/card-content.svelte
web/src/lib/components/ui/card/card-description.svelte
web/src/lib/components/ui/card/card-footer.svelte
web/src/lib/components/ui/card/card-header.svelte
web/src/lib/components/ui/card/card-title.svelte
web/src/lib/components/ui/card/card.svelte
web/src/lib/components/ui/card/index.ts
web/src/lib/components/ui/input/index.ts
web/src/lib/components/ui/input/input.svelte
web/src/lib/components/ui/skeleton/index.ts
web/src/lib/components/ui/skeleton/skeleton.svelte
web/src/lib/components/ui/textarea/index.ts
web/src/lib/components/ui/textarea/textarea.svelte
web/src/lib/demo-helpers.test.ts
web/src/lib/demo-helpers.ts
web/src/lib/utils.ts
web/src/main.ts
web/src/vite-env.d.ts
web/svelte.config.js
web/tailwind.config.js
web/tsconfig.json
web/vite.config.ts`.trim().split("\n");

const args = process.argv.slice(2);
const flags = new Set(args.filter((item) => item.startsWith("-")));
const values = new Map();
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--phase") values.set("phase", args[index + 1]);
  if (args[index] === "--inventory-file") values.set("inventory-file", args[index + 1]);
  if (args[index] === "--baseline-dir") values.set("baseline-dir", args[index + 1]);
}
const phase = values.get("phase") ?? (flags.has("--inventory") ? "inventory" : "inventory");
const inventoryPath = values.get("inventory-file") ?? INVENTORY;
if (!["inventory", "backend", "frontend", "full"].includes(phase)) {
  console.error(`comment-coverage-check: unknown --phase ${phase}; expected backend, frontend, or full`);
  process.exit(2);
}

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);
const posix = (value) => value.split(sep).join("/");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function cjkCount(text) {
  return (text.match(/[\u3400-\u9fff]/g) ?? []).length;
}

function hasWildcard(path) {
  return /[*?[\]{}]/.test(path);
}

function allowedPrefixes(path) {
  if (path.endsWith(".fs")) return ["//", "(*"];
  if (/\.(mjs|js|cjs|ts|tsx)$/.test(path)) return ["//", "/*", "*"];
  if (path.endsWith(".svelte")) return ["<!--", "//", "/*", "*"];
  if (path.endsWith(".sql")) return ["--"];
  if (path.endsWith(".css")) return ["/*", "*"];
  if (/\.(html|xml|fsproj|slnx|props)$/.test(path)) return ["<!--"];
  if (path === ".gitignore" || path.endsWith(".toml") || path.endsWith(".sh")) return ["#"];
  return ["//", "#", "--", "<!--", "/*"];
}

function headerPreambleLine(line) {
  const trimmed = line.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return true;
  return /^(#!|<\?xml\b|<!doctype\b|<Project\b|<Solution\b|<script\b|<style\b|<html\b|<head\b|<body\b|<svelte:head\b)/i.test(trimmed);
}

function extractDuty(path, text) {
  const prefixes = allowedPrefixes(path);
  const markers = [];
  for (const match of text.matchAll(/文件职责[：:]/g)) {
    const lineStart = text.lastIndexOf("\n", match.index - 1) + 1;
    const lineEnd = text.indexOf("\n", match.index) === -1 ? text.length : text.indexOf("\n", match.index);
    const line = text.slice(lineStart, lineEnd).trim();
    if (prefixes.some((prefix) => line.startsWith(prefix))) markers.push({ index: match.index, length: match[0].length, lineEnd, lineStart, line });
  }
  if (markers.length === 0) return { failure: "missing 文件职责 marker" };
  if (markers.length > 1) return { failure: `multiple 文件职责 markers (${markers.length})` };
  const marker = markers[0];
  const before = text.slice(0, marker.lineStart).split("\n");
  for (const candidate of before) {
    const trimmed = candidate.replace(/^\uFEFF/, "").trim();
    if (!trimmed) continue;
    if (prefixes.some((prefix) => trimmed.startsWith(prefix))) continue;
    if (headerPreambleLine(trimmed)) continue;
    return { failure: `文件职责 marker is not in the file header (preceded by ${JSON.stringify(trimmed.slice(0, 40))})` };
  }
  let duty = text.slice(marker.index + marker.length, marker.lineEnd);
  duty = duty.replace(/\s*(-->|\*\)|\*\/)\s*$/, "").trim();
  if (!duty) return { failure: "文件职责 marker has empty duty text" };
  const cjk = cjkCount(duty);
  if (cjk < 40) return { failure: `文件职责 duty has only ${cjk} CJK characters (need 40)`, duty };
  return { duty };
}

function dutySentences(duty) {
  return duty
    .split(/[。！？；;\n]/)
    .map((item) => item.trim())
    .filter((item) => cjkCount(item) >= 6);
}

function detectDuplicateDuties(entries) {
  const problems = [];
  const full = new Map();
  const sentence = new Map();
  for (const entry of entries) {
    const normalized = entry.duty.replace(/\s+/g, " ").trim();
    if (full.has(normalized)) {
      problems.push(`duplicate duty sentence in ${entry.path} and ${full.get(normalized)}`);
    } else {
      full.set(normalized, entry.path);
    }
    for (const part of dutySentences(entry.duty)) {
      const key = part.replace(/\s+/g, " ").trim();
      if (sentence.has(key) && sentence.get(key) !== entry.path) {
        problems.push(`duplicate sentence in ${entry.path} and ${sentence.get(key)}: ${key}`);
      } else {
        sentence.set(key, entry.path);
      }
    }
  }
  return problems;
}

function parseInventory(text) {
  const rows = [];
  const duplicates = new Set();
  const seen = new Set();
  for (const [lineNumber, line] of text.split("\n").entries()) {
    if (!line.startsWith("| `")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length !== 9) {
      fail(`${INVENTORY}:${lineNumber + 1} expected 7 table columns, got ${cells.length - 2}`);
      continue;
    }
    const path = cells[1].replace(/^`|`$/g, "");
    const row = {
      path,
      klass: cells[2],
      phase: cells[3],
      status: cells[4],
      purpose: cells[5],
      oldHash: cells[6],
      newHash: cells[7],
      line: lineNumber + 1,
    };
    if (seen.has(path)) {
      duplicates.add(path);
      fail(`${INVENTORY}:${lineNumber + 1} duplicate path ${path}`);
    }
    seen.add(path);
    rows.push(row);
  }
  return rows;
}

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || SKIP_DIRS.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) files.push(posix(relative(root, absolute)));
    else if (entry.isSymbolicLink()) {
      try {
        if (statSync(absolute).isFile()) files.push(posix(relative(root, absolute)));
      } catch {
        files.push(posix(relative(root, absolute)));
      }
    }
  }
  return files;
}

function runSelfTests() {
  const checks = [];
  const expect = (label, condition) => checks.push({ label, ok: Boolean(condition) });
  expect("missing marker rejected", Boolean(extractDuty("scripts/sample.mjs", "export const value = 1;\n").failure));
  const short = extractDuty("scripts/sample.mjs", "// 文件职责：只有少量中文字符。\n");
  expect("short duty rejected", Boolean(short.failure));
  const good = extractDuty(
    "scripts/sample.mjs",
    "// 文件职责：这是一个用于验证注释覆盖脚本自身负控逻辑的足够长中文职责说明文本，确保达到四十个中文字符阈值。\n"
  );
  expect("valid duty accepted", Boolean(good.duty));
  const moved = extractDuty(
    "scripts/sample.mjs",
    "export const value = 1;\n// 文件职责：这是一个被移动到源码末尾的足够长中文职责说明文本，用来确认首部位置检查会拒绝它而不是只看全文出现。\n"
  );
  expect("duty moved to source end rejected", Boolean(moved.failure));
  const svelteTop = extractDuty(
    "web/src/App.svelte",
    "<!-- 文件职责：这是 Svelte 顶层合法首部注释，用于确认文件职责标记位于脚本标签之前时仍会被覆盖脚本接受并通过检查。 -->\n<script>\nlet value = 1;\n</script>\n"
  );
  expect("Svelte top-level duty accepted", Boolean(svelteTop.duty));
  const duplicate = detectDuplicateDuties([
    { path: "a.mjs", duty: `${"重复职责句".repeat(8)}。` },
    { path: "b.mjs", duty: `${"重复职责句".repeat(8)}。` },
  ]);
  expect("duplicate duty rejected", duplicate.length > 0);
  expect("wildcard path rejected", hasWildcard("scripts/*.mjs"));
  expect("wildcard-free path accepted", !hasWildcard("scripts/comment-coverage-check.mjs"));
  return checks;
}

const selfChecks = runSelfTests();
for (const check of selfChecks) {
  if (!check.ok) fail(`negative control failed: ${check.label}`);
}

const inventoryFile = resolve(root, inventoryPath);
if (!existsSync(inventoryFile)) {
  console.error(`comment-coverage-check: missing inventory ${inventoryPath}`);
  process.exit(1);
}
const inventoryText = readFileSync(inventoryFile, "utf8");
const rows = parseInventory(inventoryText);

const universe = new Set([...BASELINE_PATHS, ...NEW_FILES]);
const inventoryPaths = new Set(rows.map((row) => row.path));
for (const path of universe) {
  if (!inventoryPaths.has(path)) fail(`inventory missing ${path}`);
}
for (const row of rows) {
  if (!universe.has(row.path)) fail(`inventory has path outside baseline/new union: ${row.path}`);
  if (hasWildcard(row.path)) fail(`inventory path must not contain wildcards: ${row.path}`);
  if (!["A", "B"].includes(row.klass)) fail(`inventory row ${row.path} has invalid class ${row.klass}`);
  if (!["config", "backend", "frontend", "-"].includes(row.phase)) {
    fail(`inventory row ${row.path} has invalid phase ${row.phase}`);
  }
  if (!["done", "pending", "frozen", "n/a", "exception"].includes(row.status)) {
    fail(`inventory row ${row.path} has invalid status ${row.status}`);
  }
  if (row.klass === "A" && row.phase === "-") fail(`A row ${row.path} needs a phase`);
  if (row.klass === "B") {
    if (cjkCount(row.purpose) < 8) fail(`B row ${row.path} needs a specific freeze reason`);
    if (row.phase !== "-") fail(`B row ${row.path} should use phase -`);
  } else if (cjkCount(row.purpose) < 8) {
    fail(`A row ${row.path} needs a specific responsibility`);
  }
}

for (const path of BASELINE_PATHS) {
  if (!existsSync(resolve(root, path))) fail(`baseline path is missing from the working tree: ${path}`);
}
for (const path of NEW_FILES) {
  if (PENDING_NEW.has(path) && phase !== "full") continue;
  if (!existsSync(resolve(root, path))) fail(`new deliverable is missing: ${path}`);
}

function parseManifest(text, label) {
  const map = new Map();
  for (const line of text.split("\n").filter(Boolean)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      fail(`${label} has malformed line: ${line}`);
      continue;
    }
    if (map.has(match[2])) fail(`${label} has duplicate path: ${match[2]}`);
    map.set(match[2], match[1]);
  }
  return map;
}

const missingEvidence = [BASELINE_MANIFEST, CURRENT_MANIFEST, EQUIVALENCE_INDEX]
  .filter((requiredEvidence) => !existsSync(resolve(root, requiredEvidence)));
if (missingEvidence.length) {
  for (const requiredEvidence of missingEvidence) {
    console.error(`comment-coverage-check: required baseline evidence is missing: ${requiredEvidence}`);
  }
  console.error("comment-coverage-check: FAIL (required baseline evidence missing)");
  process.exit(1);
}
const baselineManifestText = readFileSync(resolve(root, BASELINE_MANIFEST), "utf8");
const baselineManifest = parseManifest(baselineManifestText, BASELINE_MANIFEST);
const currentManifestText = readFileSync(resolve(root, CURRENT_MANIFEST), "utf8");
const currentManifest = parseManifest(currentManifestText, CURRENT_MANIFEST);

if (sha256(readFileSync(resolve(root, BASELINE_MANIFEST))) !== BASELINE_MANIFEST_SHA) {
  fail(`${BASELINE_MANIFEST} bytes changed from the bf647e31 baseline copy`);
}
if (baselineManifest.size !== 33) fail(`baseline manifest must contain 33 paths, got ${baselineManifest.size}`);
if (currentManifest.size !== 33) fail(`current manifest must contain 33 paths, got ${currentManifest.size}`);
for (const path of baselineManifest.keys()) {
  if (!currentManifest.has(path)) fail(`current manifest lost path ${path}`);
}
for (const path of currentManifest.keys()) {
  if (!baselineManifest.has(path)) fail(`current manifest added path ${path}`);
}

for (const row of rows) {
  const inManifest = baselineManifest.has(row.path);
  if (inManifest) {
    if (row.oldHash !== baselineManifest.get(row.path)) {
      fail(`inventory old hash for ${row.path} does not match the baseline manifest`);
    }
    if (row.newHash !== "pending" && !/^[a-f0-9]{64}$/.test(row.newHash)) {
      fail(`inventory new hash for ${row.path} must be pending or 64 lowercase hex characters`);
    }
    const current = currentManifest.get(row.path);
    if (row.newHash === "pending") {
      if (current !== row.oldHash) fail(`current manifest changed ${row.path} before its new hash was recorded`);
    } else if (current !== row.newHash) {
      fail(`current manifest hash for ${row.path} does not match the recorded new hash`);
    }
  } else if (row.oldHash !== "-" || row.newHash !== "-") {
    fail(`inventory row ${row.path} is outside the manifest exception but has hash columns`);
  }
}

const equivalenceIndexFile = resolve(root, EQUIVALENCE_INDEX);
if (!existsSync(equivalenceIndexFile)) {
  fail(`missing protected equivalence baseline ${EQUIVALENCE_INDEX}`);
} else {
  let indexDocument = null;
  try {
    indexDocument = JSON.parse(readFileSync(equivalenceIndexFile, "utf8"));
  } catch {
    fail(`${EQUIVALENCE_INDEX} is not valid JSON`);
  }
  if (indexDocument) {
    if (indexDocument.baseline !== BASELINE) fail(`${EQUIVALENCE_INDEX} baseline is not ${BASELINE}`);
    if (indexDocument.mode !== "comment-stripped-canonical-sha256") fail(`${EQUIVALENCE_INDEX} mode is not comment-stripped-canonical-sha256`);
    const indexPaths = Array.isArray(indexDocument.paths) ? indexDocument.paths : [];
    const indexFiles = indexDocument.files && typeof indexDocument.files === "object" ? Object.keys(indexDocument.files) : [];
    const sortedPaths = [...indexPaths].sort();
    const sortedFiles = [...indexFiles].sort();
    if (JSON.stringify(sortedPaths) !== JSON.stringify(sortedFiles)) {
      fail(`${EQUIVALENCE_INDEX} paths and files keys differ`);
    }
    const baselineSet = new Set(BASELINE_PATHS);
    for (const path of indexFiles) {
      if (!baselineSet.has(path)) fail(`${EQUIVALENCE_INDEX} contains a non-baseline path ${path}`);
      if (!/^[a-f0-9]{64}$/.test(indexDocument.files[path])) fail(`${EQUIVALENCE_INDEX} has an invalid hash for ${path}`);
    }
  }
}

function gitShow(path) {
  return execFileSync("git", ["show", `${BASELINE}:${path}`], {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

let gitBaseline = false;
try {
  if (!isRepoRoot()) throw new Error("not a git worktree root");
  gitShow("tests/demo-module-files.sha256");
  gitBaseline = true;
} catch {
  notes.push("git baseline unavailable; frozen byte comparison and baseline commit cross-check are skipped (filesystem-safe mode)");
}

if (!gitBaseline) {
  const discovered = new Set(walk(resolve(root)));
  notes.push(`filesystem walk discovered ${discovered.size} files for the no-git fallback`);
  for (const path of [...BASELINE_PATHS, ...NEW_FILES]) {
    if (PENDING_NEW.has(path) && phase !== "full") continue;
    if (!discovered.has(path)) fail(`filesystem walk does not contain ${path}`);
  }
}

if (gitBaseline) {
  const listed = execFileSync("git", ["ls-tree", "-r", "--name-only", BASELINE], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter(Boolean)
    .sort();
  const embedded = [...BASELINE_PATHS].sort();
  if (JSON.stringify(listed) !== JSON.stringify(embedded)) {
    fail(`embedded baseline path list differs from git tree ${BASELINE}`);
  }
  for (const row of rows) {
    if (row.klass !== "B" || row.status !== "frozen") continue;
    if (row.path.endsWith(".md")) continue;
    let baselineBytes;
    try {
      baselineBytes = gitShow(row.path);
    } catch {
      continue;
    }
    if (!existsSync(resolve(root, row.path))) {
      fail(`frozen B file disappeared: ${row.path}`);
      continue;
    }
    const currentBytes = readFileSync(resolve(root, row.path));
    if (!currentBytes.equals(baselineBytes)) fail(`frozen B file changed: ${row.path}`);
  }
}

const requiredMarkers = new Set();
for (const row of rows) {
  if (row.klass !== "A") continue;
  if (phase === "full") requiredMarkers.add(row.path);
  else if (phase === "backend" && row.phase === "backend") requiredMarkers.add(row.path);
  else if (phase === "frontend" && row.phase === "frontend") requiredMarkers.add(row.path);
  else if (phase === "inventory" && row.status === "done") requiredMarkers.add(row.path);
}

const dutyEntries = [];
for (const path of [...requiredMarkers].sort()) {
  if (!existsSync(resolve(root, path))) {
    fail(`required A file is missing: ${path}`);
    continue;
  }
  const info = extractDuty(path, readFileSync(resolve(root, path), "utf8"));
  if (info.failure) {
    fail(`${path}: ${info.failure}`);
    continue;
  }
  dutyEntries.push({ path, duty: info.duty });
}
for (const problem of detectDuplicateDuties(dutyEntries)) fail(problem);

if (notes.length) {
  for (const note of notes) console.log(`comment-coverage-check: note: ${note}`);
}
if (failures.length) {
  for (const failure of failures) console.error(`comment-coverage-check: ${failure}`);
  console.error(`comment-coverage-check: FAIL (${failures.length} issue(s); phase=${phase}; rows=${rows.length})`);
  process.exit(1);
}

const counts = {
  rows: rows.length,
  baseline: BASELINE_PATHS.length,
  newFiles: NEW_FILES.length,
  a: rows.filter((row) => row.klass === "A").length,
  b: rows.filter((row) => row.klass === "B").length,
  manifest: baselineManifest.size,
  checkedMarkers: dutyEntries.length,
  mode: gitBaseline ? "git-baseline" : "filesystem",
};
console.log(
  `comment-coverage-check: OK (${counts.rows} rows = ${counts.baseline} baseline + ${counts.newFiles} new; A=${counts.a} B=${counts.b}; ${counts.manifest} manifest paths; ${counts.checkedMarkers} duty markers checked; phase=${phase}; mode=${counts.mode}; negative controls passed)`
);
