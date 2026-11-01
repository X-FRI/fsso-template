// 文件职责：在 web 目录构建 SvelteKit adapter-node 产物，再发布只提供 API 的 Host；不把页面复制进 wwwroot，生产页面由 Node 进程单独启动，发布目录不包含页面入口。
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assert, cleanDir, root, runLogged } from "./lib.mjs";

const kitBuild = resolve(root, "web/build/index.js");
const publish = resolve(root, "artifacts/publish");
const web = resolve(root, "web");
const tempManifest = resolve(web, "package.json");

try {
  assert(!existsSync(tempManifest), "refusing to overwrite an existing web/package.json");
  const rootPackage = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  // adapter-node 从当前目录读取 package.json，用 dependencies 决定哪些包保持外部引用。构建结束前删除该临时清单。
  writeFileSync(
    tempManifest,
    `${JSON.stringify({ name: "fsso-web", private: true, type: "module", dependencies: rootPackage.dependencies ?? {} }, null, 2)}\n`
  );
  const frontend = runLogged(
    "frontend build",
    process.execPath,
    [resolve(root, "node_modules/vite/bin/vite.js"), "build"],
    {
      cwd: web,
      logFile: resolve(root, "artifacts/build-frontend.log"),
    }
  );
  if (frontend.status !== 0) throw new Error("frontend build failed");

  assert(existsSync(kitBuild), "frontend web/build/index.js missing");
  rmSync(resolve(root, "src/Host/wwwroot"), { recursive: true, force: true });

  cleanDir(publish);
  const publishResult = runLogged(
    "dotnet publish",
    "dotnet",
    ["publish", "src/Host", "-c", "Release", "-o", "artifacts/publish"],
    { logFile: resolve(root, "artifacts/build-publish.log") }
  );
  if (publishResult.status !== 0) throw new Error("dotnet publish failed");

  assert(existsSync(resolve(publish, "Fsso.Host.dll")), "published Fsso.Host.dll missing");
  assert(!existsSync(resolve(publish, "wwwroot/index.html")), "published Host must not include a static SPA index");

  console.log(`Build OK: ${publish}/Fsso.Host.dll + ${kitBuild}`);
  console.log(`SHA=${spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim()}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(tempManifest, { force: true });
}
