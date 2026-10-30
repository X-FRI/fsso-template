// 文件职责：以大小写不敏感和二进制安全方式扫描仓库路径及内容中的历史品牌词，支持 git 清单与无 git 文件系统回退，发现任何遗留即失败，为打包和提交提供品牌一致性门禁。
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { root } from "./lib.mjs";

const encoded = "Y2xpbndpc2U=";
const legacy = Buffer.from(encoded, "base64").toString("utf8").toLowerCase();
const needle = Buffer.from(legacy, "latin1");

const skippedDirectories = new Set([
  ".git",
  ".tools",
  "node_modules",
  "bin",
  "obj",
  "artifacts",
  "data",
  ".pnpm-store",
  ".cache",
  ".vite",
  ".tmp",
  "coverage",
  "test-results",
  "playwright-report",
  "TestResults",
  "playwright-browsers",
]);
const skippedRelativePrefixes = ["web/dist", "src/Host/wwwroot"];

function toPosix(path) {
  return path.split(sep).join("/");
}

function walk(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    const relativePath = toPosix(relative(root, absolute));

    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) continue;
      if (skippedRelativePrefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`))) continue;
      walk(absolute, files);
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else if (entry.isSymbolicLink()) {
      try {
        if (statSync(absolute).isFile()) files.push(relativePath);
      } catch {
        files.push(relativePath);
      }
    }
  }
}

const topLevel = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const insideOwnRepository =
  topLevel.status === 0 && resolve(topLevel.stdout.trim()) === resolve(root);

let paths;
let mode;

if (insideOwnRepository) {
  const listing = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (listing.status === 0) {
    paths = listing.stdout.toString("utf8").split("\0").filter(Boolean);
    mode = "git";
  } else {
    console.warn(
      `brand-check: git listing unavailable (RC=${listing.status ?? "none"}); using filesystem fallback`
    );
    paths = [];
    walk(root, paths);
    paths.sort();
    mode = "filesystem";
  }
} else {
  console.warn(
    `brand-check: repository root is not this directory (git top-level ${
      topLevel.status === 0 ? topLevel.stdout.trim() : "unavailable"
    }); using filesystem fallback`
  );
  paths = [];
  walk(root, paths);
  paths.sort();
  mode = "filesystem";
}

if (paths.length === 0) {
  console.error(`brand-check: FAIL (scanned zero paths via ${mode} at ${root})`);
  process.exit(1);
}

const failures = [];

function hasLegacy(buffer) {
  const haystack = buffer.toString("latin1").toLowerCase();
  let index = haystack.indexOf(legacy);
  while (index !== -1) {
    const matched = Buffer.from(haystack.slice(index, index + legacy.length), "latin1");
    if (matched.equals(needle)) return true;
    index = haystack.indexOf(legacy, index + 1);
  }
  return false;
}

for (const relativePath of paths) {
  if (hasLegacy(Buffer.from(relativePath, "utf8"))) {
    failures.push({ path: relativePath, location: "path" });
    continue;
  }

  let bytes;
  try {
    bytes = readFileSync(resolve(root, relativePath));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }

  if (hasLegacy(bytes)) failures.push({ path: relativePath, location: "bytes" });
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`brand-check: legacy token in ${failure.location}: ${failure.path}`);
  }
  console.error(
    `brand-check: FAIL (${failures.length} ${mode} occurrence(s); scanned ${paths.length} paths via ${mode} at ${root})`
  );
  process.exit(1);
}

const source = mode === "git" ? "tracked" : "filesystem";
console.log(
  `brand-check: OK (${paths.length} ${source} paths and contents via ${mode}, case-insensitive, binary-safe; root=${root})`
);
