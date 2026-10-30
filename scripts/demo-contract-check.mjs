// 文件职责：从基线提交抽取 Demo 的 OpenAPI 路径、schema 与 SDK 操作/类型子集，与冻结快照做规范化比较，确保四个 Demo 操作和错误类型契约不变。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assert, root } from "./lib.mjs";

const BASELINE = "08b7116";
const OPENAPI = "openapi/openapi.json";
const SDK = "web/src/lib/api/generated/sdk.gen.ts";
const TYPES = "web/src/lib/api/generated/types.gen.ts";
const OPENAPI_SNAPSHOT = "scripts/demo-contract.json";
const SDK_SNAPSHOT = "scripts/demo-sdk-contract.json";
const DEMO_PATHS = ["/api/demos", "/api/demos/{id}"];
const DEMO_OPERATIONS = ["createDemo", "deleteDemo", "getDemo", "listDemos"];
const DEMO_TYPES = [
  "CreateDemoRequest",
  "DemoResponse",
  "PagedDemoResponse",
  "ErrorResponse",
  "CreateDemoData",
  "CreateDemoErrors",
  "CreateDemoError",
  "CreateDemoResponses",
  "CreateDemoResponse",
  "ListDemosData",
  "ListDemosErrors",
  "ListDemosError",
  "ListDemosResponses",
  "ListDemosResponse",
  "GetDemoData",
  "GetDemoErrors",
  "GetDemoError",
  "GetDemoResponses",
  "GetDemoResponse",
  "DeleteDemoData",
  "DeleteDemoErrors",
  "DeleteDemoError",
  "DeleteDemoResponses",
  "DeleteDemoResponse",
];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function collectRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "$ref" && typeof item === "string") refs.add(item);
      else collectRefs(item, refs);
    }
  }
  return refs;
}

function openApiSubset(document) {
  const paths = {};
  for (const path of DEMO_PATHS) {
    assert(document.paths?.[path], `OpenAPI is missing Demo path ${path}`);
    paths[path] = document.paths[path];
  }

  const schemas = document.components?.schemas ?? {};
  const queue = [...collectRefs(paths)];
  const selected = {};
  while (queue.length) {
    const reference = queue.shift();
    const prefix = "#/components/schemas/";
    assert(reference.startsWith(prefix), `Demo path has unsupported reference ${reference}`);
    const name = reference.slice(prefix.length);
    if (selected[name]) continue;
    assert(schemas[name], `Demo reference ${reference} is unresolved`);
    selected[name] = schemas[name];
    for (const nested of collectRefs(selected[name])) queue.push(nested);
  }

  return { paths, components: { schemas: selected } };
}

function extractBlock(source, declaration, label) {
  const start = source.indexOf(declaration);
  assert(start !== -1, `missing ${label} declaration (${declaration})`);
  const rest = source.slice(start + declaration.length);
  const boundary = rest.search(/\n(?=export\s|\/\*\*)/);
  const block = (boundary === -1 ? rest : rest.slice(0, boundary)).trimEnd();
  return `${declaration}${block}`;
}

function sdkSubset(sdk, types) {
  const operations = {};
  for (const name of DEMO_OPERATIONS) operations[name] = extractBlock(sdk, `export const ${name} =`, name);
  const declarations = {};
  for (const name of DEMO_TYPES) declarations[name] = extractBlock(types, `export type ${name} =`, name);
  return { operations, types: declarations };
}

function gitShow(path) {
  return execFileSync("git", ["show", `${BASELINE}:${path}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function capture() {
  const openapi = openApiSubset(JSON.parse(gitShow(OPENAPI)));
  const sdk = sdkSubset(gitShow(SDK), gitShow(TYPES));
  writeFileSync(resolve(root, OPENAPI_SNAPSHOT), `${JSON.stringify(openapi, null, 2)}\n`);
  writeFileSync(resolve(root, SDK_SNAPSHOT), `${JSON.stringify(sdk, null, 2)}\n`);
  console.log(`demo-contract-check: captured baseline ${BASELINE} snapshots (${OPENAPI_SNAPSHOT}, ${SDK_SNAPSHOT})`);
}

function check() {
  const expectedOpenApi = JSON.parse(readFileSync(resolve(root, OPENAPI_SNAPSHOT), "utf8"));
  const expectedSdk = JSON.parse(readFileSync(resolve(root, SDK_SNAPSHOT), "utf8"));
  const currentOpenApi = openApiSubset(JSON.parse(readFileSync(resolve(root, OPENAPI), "utf8")));
  const currentSdk = sdkSubset(readFileSync(resolve(root, SDK), "utf8"), readFileSync(resolve(root, TYPES), "utf8"));

  assert(
    canonical(currentOpenApi) === canonical(expectedOpenApi),
    "Demo OpenAPI subset changed from the frozen baseline"
  );
  assert(
    canonical(currentSdk) === canonical(expectedSdk),
    "Demo SDK declarations changed from the frozen baseline"
  );

  console.log(
    `demo-contract-check: OK (Demo OpenAPI ${DEMO_PATHS.length} paths, ${Object.keys(expectedOpenApi.components.schemas).length} schemas; SDK ${DEMO_OPERATIONS.length} operations, ${DEMO_TYPES.length} types)`
  );
}

if (process.argv.includes("--capture")) capture();
else check();
