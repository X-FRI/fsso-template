// 文件职责：检查目录层级、解决方案项目清单、程序集名、环境变量命名、OpenAPI 标题、UI 品牌、脚本禁用写法与报告状态，维护整栈结构契约。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  assert,
  assertReportGates,
  collectApiSymbols,
  collectDemoApiSymbols,
  hostBoundaryViolations,
  moduleBoundaryViolations,
  root,
  stripFSharpComments,
} from "./lib.mjs";

const read = (relative) => readFileSync(resolve(root, relative), "utf8");
const pkg = JSON.parse(read("package.json"));

assert(pkg.name === "fsso-stack", `root package name must be fsso-stack, got ${pkg.name}`);
assert(pkg.private === true, "root package must be private");
assert(!existsSync(resolve(root, "pnpm-workspace.yaml")), "pnpm-workspace.yaml must not exist");
assert(!existsSync(resolve(root, "apps")), "apps/ must not exist");
assert(!existsSync(resolve(root, "web/package.json")), "web/package.json must not exist");
assert(existsSync(resolve(root, "pnpm-lock.yaml")), "root pnpm-lock.yaml missing");

for (const dependency of [
  "svelte",
  "vite",
  "tailwindcss",
  "bits-ui",
  "clsx",
  "tailwind-merge",
  "tailwind-variants",
  "@hey-api/client-fetch",
  "@playwright/test",
  "vitest",
  "svelte-check",
  "typescript",
  "shadcn-svelte",
  "@sveltejs/kit",
  "@sveltejs/adapter-node",
  "@sveltejs/vite-plugin-svelte",
  "@tailwindcss/vite",
  "tw-animate-css",
  "formsnap",
  "sveltekit-superforms",
  "@tanstack/svelte-query",
  "@tanstack/table-core",
  "@lucide/svelte",
  "zod",
]) {
  const owned = pkg.dependencies?.[dependency] ?? pkg.devDependencies?.[dependency];
  assert(Boolean(owned), `root package must own ${dependency}`);
}

const solution = read("FssoStack.slnx");
const projects = [
  "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  "src/Shared/Fsso.Database/Fsso.Database.fsproj",
  "src/Shared/Fsso.Api/Fsso.Api.fsproj",
  "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
  "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
  "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
  "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
  "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
  "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
  "src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj",
  "src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj",
  "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
  "src/Host/Fsso.Host.fsproj",
  "tests/Domain.Tests/Fsso.Domain.Tests.fsproj",
  "tests/Application.Tests/Fsso.Application.Tests.fsproj",
  "tests/Integration.Tests/Fsso.Integration.Tests.fsproj",
  "tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj",
  "tests/Notes.Tests/Fsso.Notes.Tests.fsproj",
];
for (const project of projects) {
  assert(existsSync(resolve(root, project)), `missing project ${project}`);
  assert(solution.includes(project), `solution does not reference ${project}`);
}

for (const oldProject of [
  "src/Domain/Fsso.Domain.fsproj",
  "src/Application/Fsso.Application.fsproj",
  "src/Infrastructure/Fsso.Infrastructure.fsproj",
]) {
  assert(!existsSync(resolve(root, oldProject)), `old layer project must not exist: ${oldProject}`);
  assert(!solution.includes(oldProject), `solution must not reference old layer project: ${oldProject}`);
}

for (const oldFile of ["src/Host/HttpDtos.fs", "src/Host/HttpResults.fs", "src/Host/OpenApi.fs"]) {
  assert(!existsSync(resolve(root, oldFile)), `old Host file must not exist: ${oldFile}`);
}

assert(/<AssemblyName>Fsso\.Host<\/AssemblyName>/.test(read("src/Host/Fsso.Host.fsproj")), "Host assembly must be Fsso.Host");
assert(read("Directory.Build.props").includes("<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>"), "Directory.Build.props must disable transitive project references");

for (const file of ["src/Modules/Demo/Domain/Demo.fs", "src/Shared/Fsso.SharedKernel/Errors.fs", "src/Shared/Fsso.Database/Migrations.fs", "src/Host/Program.fs"]) {
  assert(/^namespace Fsso\.|^module Fsso\./m.test(read(file)), `${file} must use Fsso namespaces`);
}

assert(existsSync(resolve(root, "src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql")), "Demo migration 001 missing");
assert(existsSync(resolve(root, "src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql")), "Demo migration 002 missing");
assert(existsSync(resolve(root, "src/Modules/Demo/Api/DemoEndpoints.fs")), "DemoEndpoints.fs must be separate");
assert(existsSync(resolve(root, "src/Modules/Demo/Api/DemoModule.fs")), "DemoModule.fs must be separate");
assert(!existsSync(resolve(root, "src/Modules/Demo/Api/DemoApi.fs")), "combined Demo API file must not exist");
assert(existsSync(resolve(root, "src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql")), "Notes migration 003 missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Domain/Note.fs")), "Notes domain Note.fs missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Application/Commands/CreateNoteCommand.fs")), "CreateNoteCommand.fs missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Application/Queries/GetNoteQuery.fs")), "GetNoteQuery.fs missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs")), "CreateNoteHandler.fs missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Application/Handlers/GetNoteHandler.fs")), "GetNoteHandler.fs missing");
assert(existsSync(resolve(root, "src/Modules/Notes/Api/NoteDtos.fs")), "NoteDtos.fs must be separate");
assert(existsSync(resolve(root, "src/Modules/Notes/Api/NoteEndpoints.fs")), "NoteEndpoints.fs must be separate");
assert(existsSync(resolve(root, "src/Modules/Notes/Api/NotesModule.fs")), "NotesModule.fs must be separate");
assert(existsSync(resolve(root, "src/Composition/Fsso.Composition/SqliteUnitOfWork.fs")), "shared UoW must live in Composition");
assert(!existsSync(resolve(root, "src/Modules/Demo/Infrastructure/SqliteUnitOfWork.fs")), "Demo module must not own the shared UoW");
assert(!existsSync(resolve(root, "src/Modules/Notes/Infrastructure/SqliteUnitOfWork.fs")), "Notes module must not own the shared UoW");
assert(read("src/Composition/Fsso.Composition/Composition.fs").includes("NotesMigrations.all"), "Composition must aggregate Notes migrations");
assert(read("src/Composition/Fsso.Composition/SqliteUnitOfWork.fs").includes("NoteStoreRegistration"), "Composition must register the Notes store");

const demoSymbols = collectDemoApiSymbols(root);
const notesSymbols = collectApiSymbols(root, "Notes");
const hostSources = readdirSync(resolve(root, "src/Host"), { withFileTypes: true, recursive: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".fs") &&
      !/(^|[/\\])(bin|obj)([/\\]|$)/.test(entry.parentPath ?? entry.path)
  )
  .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
for (const file of hostSources) {
  const source = readFileSync(file, "utf8");
  const violations = hostBoundaryViolations(source, demoSymbols);
  assert(
    violations.length === 0,
    `${relative(root, file)} violates the Host/Demo.Api boundary: ${violations.join("; ")}`
  );
  const notesViolations = moduleBoundaryViolations(
    source,
    "Fsso.Notes.Api",
    notesSymbols,
    new Set(["NotesModule"]),
    ["Fsso.Database", "Fsso.Notes.Infrastructure", "Fsso.Notes.Application", "Fsso.Notes.Domain", "Fsso.Domain"]
  );
  assert(
    notesViolations.length === 0,
    `${relative(root, file)} violates the Host/Notes.Api boundary: ${notesViolations.join("; ")}`
  );
}

const program = read("src/Host/Program.fs");
const programWithoutComments = stripFSharpComments(program);
const programWithoutCommentsOrStrings = stripFSharpComments(program, { blankStrings: true });
assert(program.includes("FSSO_DB_PATH"), "Host must read FSSO_DB_PATH");
assert(program.includes("FSSO_FAULT_INJECTION"), "Host must read FSSO_FAULT_INJECTION");
assert(program.includes("DemoModule.descriptor"), "Host must mount the Demo descriptor");
assert(program.includes("NotesModule.descriptor"), "Host must mount the Notes descriptor");
assert(!programWithoutComments.includes("/api/demos"), "Host must not contain Demo route literals");
assert(!programWithoutComments.includes("/api/notes"), "Host must not contain Notes route literals");
assert(!/CreateDemoHandler|IDemoStore|SqliteDemoStore/.test(programWithoutCommentsOrStrings), "Host must not reference Demo handler/store types");
assert(!/CreateNoteHandler|INoteStore|SqliteNoteStore|NoteResponse|NoteEndpoints/.test(programWithoutCommentsOrStrings), "Host must not reference Notes handler/store/DTO types");

const database = read("src/Shared/Fsso.Database/Db.fs");
assert(/Path\.Combine\("data", "fsso\.db"\)/.test(database), "default database must be data/fsso.db");

for (const file of ["scripts/dev.mjs", "scripts/gen-openapi.mjs", "scripts/gen-sqlhydra.sh", "scripts/test.mjs", "scripts/package-source.mjs", "scripts/release-smoke.mjs"]) {
  assert(/FSSO_/.test(read(file)), `${file} must use FSSO_ environment names`);
}

assert(!existsSync(resolve(root, "scripts/map-app.mjs")), "old mapping script must not exist");
assert(read("openapi/openapi.json").includes('"title": "FSSO Stack API"'), "OpenAPI title must be FSSO Stack API");
assert(read("web/index.html").includes("<title>FSSO Stack</title>"), "UI index title must be FSSO Stack");
assert(read("web/src/app.html").includes("<title>FSSO Stack</title>"), "SvelteKit document title must be FSSO Stack");
assert(read("web/src/App.svelte").includes(">FSSO Stack</h1>"), "UI heading must be FSSO Stack");
assert(read("web/svelte.config.js").includes("@sveltejs/adapter-node"), "frontend must use adapter-node");
assert(read("web/src/hooks.server.ts").includes('pathname.startsWith("/api/")'), "SvelteKit server hook must proxy /api");
assert(read("web/src/App.svelte").includes("Form.Field"), "create form must use Formsnap fields");
assert(read("web/src/App.svelte").includes("superForm"), "create form must use Superforms");
assert(!read("src/Host/Program.fs").includes("UseStaticFiles"), "Host must not serve static pages");
assert(read(".gitignore").includes("web/dist/"), ".gitignore must ignore web/dist/");
assert(read(".gitignore").includes("web/build/"), ".gitignore must ignore web/build/");
const agents = read("AGENTS.md");
assert(agents.includes("SvelteKit") && agents.includes("adapter-node"), "AGENTS.md must require SvelteKit adapter-node");
assert(agents.includes("Form.Field") && agents.includes("sveltekit-superforms"), "AGENTS.md must require Formsnap and Superforms");
assert(agents.includes("MediatR") && agents.includes("SqlHydra") && agents.includes("SQLite"), "AGENTS.md must keep the backend stack");
assert(read("scripts/package-source.mjs").includes("fsso-modular-source-v2.tar.gz"), "archive default must be fsso-modular-source-v2.tar.gz");
assert(read("scripts/package-source.mjs").includes("FSSO_ARCHIVE_PATH"), "package-source must support an explicit FSSO_ARCHIVE_PATH");
assert(read("README.md").includes("fsso-modular-source-v2.tar.gz"), "README.md must document the v2 archive name");
assert(read("README_zh.md").includes("fsso-modular-source-v2.tar.gz"), "README_zh.md must document the v2 archive name");
assert(!read("scripts/package-source.mjs").includes("fsso-stack-source.tar.gz"), "package-source must not overwrite the previous archive name");

const forbiddenDirFlag = ["-", "-dir"].join("");
const oldAppPath = ["apps", "frontend"].join("/");
const activeScripts = readdirSync(resolve(root, "scripts")).filter((name) => name.endsWith(".mjs"));
for (const name of activeScripts) {
  const source = read(`scripts/${name}`);
  assert(!source.includes(forbiddenDirFlag), `scripts/${name} must not use the directory flag`);
  assert(!source.includes(oldAppPath), `scripts/${name} must not reference the old app path`);
}
assert(!read("package.json").includes(forbiddenDirFlag), "root scripts must not use the directory flag");

assertReportGates(root);
console.log("structure-check: OK (shared/module/composition layout, solution, assemblies, env, DB, OpenAPI, UI, report gates, no legacy layers)");
