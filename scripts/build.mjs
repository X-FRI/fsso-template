// 文件职责：调用 dotnet publish 生成 Host 发布目录，检查静态资源与可执行文件是否齐全，并记录构建日志与返回码，作为生产构建的唯一脚本入口。
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { assert, cleanDir, pnpmRunner, root, runLogged } from "./lib.mjs";

const dist = resolve(root, "web/dist");
const wwwroot = resolve(root, "src/Host/wwwroot");
const publish = resolve(root, "artifacts/publish");
const pnpm = pnpmRunner();
const web = resolve(root, "web");

try {
  const frontend = runLogged("frontend build", pnpm.command, [...pnpm.prefix, "exec", "vite", "build", "--config", "web/vite.config.ts"], {
    logFile: resolve(root, "artifacts/build-frontend.log"),
  });
  if (frontend.status !== 0) throw new Error("frontend build failed");

  assert(existsSync(resolve(dist, "index.html")), "frontend dist/index.html missing");
  cleanDir(wwwroot);
  cpSync(dist, wwwroot, { recursive: true });
  assert(existsSync(resolve(wwwroot, "index.html")), "copied wwwroot/index.html missing");

  cleanDir(publish);
  const publishResult = runLogged(
    "dotnet publish",
    "dotnet",
    ["publish", "src/Host", "-c", "Release", "-o", "artifacts/publish"],
    { logFile: resolve(root, "artifacts/build-publish.log") }
  );
  if (publishResult.status !== 0) throw new Error("dotnet publish failed");

  assert(existsSync(resolve(publish, "wwwroot/index.html")), "published wwwroot/index.html missing");
  assert(existsSync(resolve(publish, "Fsso.Host.dll")), "published Fsso.Host.dll missing");

  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: root,
    encoding: "utf8",
  });
  if (inside.status === 0 && inside.stdout.trim() === "true") {
    const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "src/Host/wwwroot"], {
      cwd: root,
      encoding: "utf8",
    });
    assert(status.status === 0, "git status failed");
    assert(status.stdout.trim() === "", `generated wwwroot is not ignored:\n${status.stdout}`);
  } else {
    console.log("Not a git worktree; skipping git-ignore assertion for generated wwwroot.");
  }

  console.log(`Build OK: ${publish}/Fsso.Host.dll (wwwroot from frontend dist)`);
  console.log(`SHA=${spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim()}`);
} finally {
  rmSync(wwwroot, { recursive: true, force: true });
}
