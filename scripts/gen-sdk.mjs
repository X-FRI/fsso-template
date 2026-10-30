// 文件职责：调用 hey-api openapi-ts 读取 OpenAPI 快照并输出 TypeScript SDK 到 web/src/lib/api/generated，随后只检查必需操作名、必需类型名和 index.ts 是否存在；不执行契约检查或哈希比较。
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pnpmRunner, root } from "./lib.mjs";

const web = resolve(root, "web");
const pnpm = pnpmRunner();
const generated = resolve(web, "src/lib/api/generated");

const result = spawnSync(
  pnpm.command,
  [...pnpm.prefix, "exec", "openapi-ts", "-f", "web/openapi-ts.config.ts"],
  { cwd: root, stdio: "inherit", env: process.env }
);

if (result.status !== 0) {
  console.error(`openapi-ts failed with code ${result.status}`);
  process.exit(result.status ?? 1);
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? collectFiles(join(directory, entry.name))
      : [join(directory, entry.name)]
  );
}

const source = collectFiles(generated)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const missing = ["createDemo", "listDemos", "getDemo", "deleteDemo", "createNote", "getNote"].filter(
  (name) => !source.includes(name)
);

if (missing.length) {
  console.error(`Generated SDK is missing operations: ${missing.join(", ")}`);
  process.exit(1);
}

const missingTypes = ["DemoResponse", "CreateDemoRequest", "PagedDemoResponse", "NoteResponse", "CreateNoteRequest"].filter(
  (name) => !new RegExp(`export\\s+type\\s+${name}\\b`).test(source)
);

if (missingTypes.length) {
  console.error(`Generated SDK is missing types: ${missingTypes.join(", ")}`);
  process.exit(1);
}

const index = join(generated, "index.ts");
if (!existsSync(index)) {
  console.error("Generated SDK index.ts is missing");
  process.exit(1);
}

console.log(
  "Generated SDK verified: createDemo, listDemos, getDemo, deleteDemo, createNote, getNote and Demo/Note request/response types"
);
