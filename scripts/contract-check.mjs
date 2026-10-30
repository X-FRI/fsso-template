// 文件职责：读取契约哈希清单，对 OpenAPI 文档与生成 SDK 的每个文件重新计算 SHA256，并检查 SDK 目录没有多余或缺失文件，防止生成契约被注释任务改写。
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { root } from "./lib.mjs";

const manifest = JSON.parse(readFileSync(resolve(root, "scripts/contract-hashes.json"), "utf8"));
const expected = new Map(manifest.files.map((item) => [item.path, item.sha256]));
const failures = [];

for (const [path, hash] of expected) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) {
    failures.push(`missing ${path}`);
    continue;
  }
  const actual = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (actual !== hash) failures.push(`changed ${path}: expected ${hash}, got ${actual}`);
}

function walk(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) files.push(relative(root, absolute).split("\\").join("/"));
  }
}

const actualSdk = [];
walk(resolve(root, manifest.sdkRoot), actualSdk);
const expectedSdk = [...expected.keys()].filter((path) => path.startsWith(`${manifest.sdkRoot}/`)).sort();
actualSdk.sort();
for (const path of actualSdk) {
  if (!expected.has(path)) failures.push(`unexpected ${path}`);
}
for (const path of expectedSdk) {
  if (!actualSdk.includes(path)) failures.push(`missing ${path}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`contract-check: ${failure}`);
  console.error(`contract-check: FAIL (${failures.length} difference(s))`);
  process.exit(1);
}

const openapiHash = expected.get(manifest.openapi);
console.log(
  `contract-check: OK (${expected.size} frozen files; OpenAPI ${openapiHash}; SDK sdk.gen.ts ${expected.get(`${manifest.sdkRoot}/sdk.gen.ts`)})`
);
