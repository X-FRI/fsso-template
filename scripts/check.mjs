// 文件职责：按固定顺序串行调用品牌、结构、MediatR、契约、架构、Demo 契约、dotnet build、SvelteKit sync 与 svelte-check，任一阶段失败立即退出，该入口不启动数据库，也不发布产物。
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "web");

function run(label, command, args, options = {}) {
  console.log(`\n== ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: "inherit",
    env: process.env,
  });
  console.log(`== ${label} RC=${result.status}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("brand check", process.execPath, ["scripts/brand-check.mjs"]);
run("structure check", process.execPath, ["scripts/structure-check.mjs"]);
run("MediatR check", process.execPath, ["scripts/check-mediatr.mjs"]);
run("contract check", process.execPath, ["scripts/contract-check.mjs"]);
run("architecture check", process.execPath, ["scripts/architecture-check.mjs"]);
run("demo contract check", process.execPath, ["scripts/demo-contract-check.mjs"]);
run("dotnet build", "dotnet", ["build", "FssoStack.slnx", "-warnaserror"]);
run("svelte-kit sync", process.execPath, [resolve(root, "node_modules/@sveltejs/kit/svelte-kit.js"), "sync"], {
  cwd: web,
});
run(
  "svelte-check",
  process.execPath,
  [resolve(root, "node_modules/svelte-check/bin/svelte-check"), "--tsconfig", "tsconfig.json"],
  { cwd: web }
);
