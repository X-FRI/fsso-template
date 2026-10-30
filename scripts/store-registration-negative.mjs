// 文件职责：创建缺少 store 注册的临时组合配置并启动 Host，断言进程按 fail-closed 规则失败退出，证明组合根校验真实生效，同时不修改正式组合根代码。
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { root } from "./lib.mjs";

const artifacts = resolve(root, "artifacts");
const work = resolve(artifacts, `store-registration-negative-${process.pid}-${Date.now()}`);
const logFile = resolve(artifacts, "store-registration-negative.log");
const expected = "Store registration Fsso.Notes.Infrastructure.NoteStoreRegistration was not found";
const skip = new Set([".git", ".tools", "node_modules", "artifacts", "bin", "obj", "wwwroot", "dist"]);

function copyTree(repoRoot) {
  let paths;
  try {
    const listing = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "src", "Directory.Build.props"],
      { cwd: repoRoot, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }
    );
    paths = listing.toString("utf8").split("\0").filter(Boolean);
  } catch {
    paths = [];
    const visit = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          if (!skip.has(entry.name)) visit(absolute);
        } else {
          paths.push(relative(repoRoot, absolute).split("\\").join("/"));
        }
      }
    };
    visit(resolve(repoRoot, "src"));
    paths.push("Directory.Build.props");
  }

  for (const path of paths) {
    const target = resolve(work, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(repoRoot, path), target);
  }
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
copyTree(root);

const noteStore = resolve(work, "src/Modules/Notes/Infrastructure/SqliteNoteStore.fs");
const source = readFileSync(noteStore, "utf8");
const mutated = source.replace("module NoteStoreRegistration", "module RenamedNoteStoreRegistration");
if (mutated === source) {
  throw new Error("negative check could not rename NoteStoreRegistration");
}
writeFileSync(noteStore, mutated);

const result = spawnSync("dotnet", ["run", "--project", "src/Host", "--no-launch-profile"], {
  cwd: work,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  timeout: 180_000,
  env: {
    ...process.env,
    FSSO_DB_PATH: resolve(work, "artifacts/negative.db"),
    ASPNETCORE_ENVIRONMENT: "Production",
    ASPNETCORE_URLS: "http://127.0.0.1:0",
  },
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
writeFileSync(logFile, output);

if (result.status === 0) {
  console.error(`store-registration-negative: FAILED (Host unexpectedly exited 0); log ${logFile}`);
  process.exit(1);
}
if (!output.includes(expected)) {
  console.error(`store-registration-negative: FAILED (missing expected message \"${expected}\"); log ${logFile}`);
  process.exit(1);
}
if (output.includes("Now listening on:")) {
  console.error(`store-registration-negative: FAILED (Host started listening before failing); log ${logFile}`);
  process.exit(1);
}

console.log(`store-registration-negative: OK (startup RC=${result.status}, fail-fast registration error, log ${logFile})`);
