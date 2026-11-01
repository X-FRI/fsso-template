// 文件职责：封装 shadcn-svelte CLI 添加组件的流程，记录 CLI 命令与版本，并在生成前后比较根 package.json 与 pnpm-lock.yaml 的 SHA256 以确认未被改动；不保存组件源码来源或组件级哈希。
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assert, root } from "./lib.mjs";

const web = resolve(root, "web");
const tempManifest = join(web, "package.json");
const rootManifest = join(root, "package.json");
const rootLock = join(root, "pnpm-lock.yaml");
const cli = join(root, "node_modules", ".bin", "shadcn-svelte");
const args = process.argv.slice(2);
let staged = false;

const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const snapshot = () => ({ manifest: hash(rootManifest), lock: hash(rootLock) });

function fail(message) {
  console.error(`shadcn-add: ${message}`);
  process.exitCode = 1;
}

function validateArgs() {
  if (args.length === 0) throw new Error("pass at least one component name");
  for (const arg of args) {
    if (arg === "--cwd" || arg.startsWith("--cwd=")) throw new Error("--cwd is managed by this wrapper");
    if (arg === "--no-deps-install") throw new Error("--no-deps-install is managed by this wrapper");
  }
}

function cleanup() {
  if (!staged) return;
  rmSync(tempManifest, { force: true });
  staged = false;
}

try {
  validateArgs();
  assert(existsSync(join(web, "components.json")), "web/components.json is missing");
  assert(existsSync(cli), "official shadcn-svelte CLI is missing; run pnpm install");
  assert(!existsSync(tempManifest), "web/package.json already exists; refusing to overwrite it");
  assert(existsSync(rootLock), "root pnpm-lock.yaml is missing");

  const manifest = JSON.parse(readFileSync(rootManifest, "utf8"));
  assert(manifest.devDependencies?.["shadcn-svelte"] === "1.7.2", "root devDependency shadcn-svelte must be 1.7.2");
  assert(manifest.packageManager?.startsWith("pnpm@"), "root package.json must declare pnpm");

  const before = snapshot();
  const nestedState = {
    nodeModules: existsSync(join(web, "node_modules")),
    locks: new Set(
      ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"].filter((name) => existsSync(join(web, name)))
    ),
  };
  writeFileSync(tempManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  staged = true;
  console.log(`shadcn-add: staged temporary web/package.json; running official CLI 1.7.2`);

  const command = [cli, ["add", ...args, "--cwd", "web", "--no-deps-install", "-y"]];
  console.log(`shadcn-add: ${command[0]} ${command[1].join(" ")}`);
  const result = spawnSync(command[0], command[1], { cwd: root, stdio: "inherit" });
  const rc = result.error || result.signal || result.status === null ? 1 : result.status;
  if (result.error) console.error(`shadcn-add: CLI error: ${result.error.message}`);
  console.log(`shadcn-add: CLI RC=${rc}`);

  cleanup();
  assert(!existsSync(tempManifest), "temporary web/package.json remains after cleanup");

  const after = snapshot();
  assert(before.manifest === after.manifest, "root package.json changed unexpectedly during component generation");
  assert(before.lock === after.lock, "root pnpm-lock.yaml changed unexpectedly during component generation");

  for (const nested of ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]) {
    if (!nestedState.locks.has(nested)) assert(!existsSync(join(web, nested)), `nested lockfile created: web/${nested}`);
  }
  if (!nestedState.nodeModules) {
    assert(!existsSync(join(web, "node_modules")), "web/node_modules was created; dependency installation must stay at root");
  }

  const componentRoot = join(web, "src", "lib", "components", "ui");
  if (rc === 0) console.log(`shadcn-add: generated ${args.join(" ")} under ${componentRoot}`);
  else console.error("shadcn-add: generation failed; temporary manifest was removed");
  process.exitCode = rc;
} catch (error) {
  cleanup();
  if (staged && existsSync(tempManifest)) {
    console.error(`shadcn-add: cleanup failed; remove ${tempManifest} manually`);
  }
  fail(error.message);
} finally {
  cleanup();
}
