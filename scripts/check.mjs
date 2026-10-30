// 文件职责：按固定顺序串行调用品牌、结构、MediatR、契约、架构、Demo 契约、dotnet build 与 svelte-check，任一阶段失败立即退出，作为提交前统一检查入口。
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.env.npm_execpath;
const pnpmPrefix = pnpm?.includes("pnpm") ? [pnpm] : [];

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
run(
  "svelte-check",
  pnpmPrefix[0] ? process.execPath : "pnpm",
  [...pnpmPrefix, "exec", "svelte-check", "--tsconfig", "web/tsconfig.json"]
);
