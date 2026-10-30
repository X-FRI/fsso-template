// 文件职责：用精确的逐字符扫描器删除注释但保留其余全部原始字节与缩进，按 F#、JS/TS/template/regex、XML/CDATA、fsproj、slnx、SQL、CSS、HTML、Svelte、TOML 与 shell 与基线逐文件比较；缺少基线、缺少条目或缺少文件一律 fail closed，并为诊断保留显式 NOT_VERIFIED 模式。
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function isRepoRoot() {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return realpathSync(top) === realpathSync(root);
  } catch {
    return false;
  }
}
const BASELINE = "bf647e31f1cd0395d784d90935f37d7e56d27b80";
const DEFAULT_INDEX = "docs/evidence/comment-equivalence-baseline.bf647e31.json";
const NEW_FILES = [
  "docs/comment-standard-spec.zh.md",
  "docs/plans/2026-10-29-comment-coverage.zh.md",
  "docs/comment-inventory.zh.md",
  "scripts/comment-coverage-check.mjs",
  "scripts/comment-equivalence-check.mjs",
  "docs/evidence/demo-module-files.baseline.bf647e31.sha256",
  "docs/evidence/comment-equivalence-baseline.bf647e31.json",
  "docs/architecture-guide.zh.md",
];
const SKIP_DIRS = new Set([
  ".git",
  ".tools",
  ".tmp",
  "node_modules",
  ".pnpm-store",
  "artifacts",
  "bin",
  "obj",
  "test-results",
  "playwright-report",
  "coverage",
  "data",
  "dist",
  "wwwroot",
  ".svelte-kit",
]);
const BASELINE_PATHS = `.config/dotnet-tools.json
.gitignore
Directory.Build.props
FssoStack.slnx
README.md
README_zh.md
docs/design.md
docs/evidence/baseline-backend-test-identities.json
docs/fsso-modular-spec.md
docs/fsso-stack-spec.md
docs/ledger.md
docs/plans/2026-10-28-pre-fsso-starter.md
docs/plans/2026-10-29-fsso-modular.md
docs/plans/2026-10-29-fsso-stack.md
docs/reviews/final-report.md
docs/reviews/fsso-final-report.md
docs/reviews/fsso-modular-final-report.md
docs/reviews/fsso-modular-review-log.md
docs/reviews/fsso-modular-task1-implementer.md
docs/reviews/fsso-modular-task2-implementer.md
docs/reviews/fsso-shadcn-generator.md
docs/reviews/fsso-task-1-implementer.md
docs/reviews/fsso-task-2-implementer.md
docs/reviews/fsso-task-3-implementer.md
docs/reviews/task-1-implementer.md
docs/reviews/task-2-implementer.md
docs/reviews/task-3-implementer.md
openapi/openapi.json
package.json
pnpm-lock.yaml
scripts/architecture-check.mjs
scripts/brand-check.mjs
scripts/build.mjs
scripts/check-mediatr.mjs
scripts/check.mjs
scripts/contract-check.mjs
scripts/contract-hashes.json
scripts/demo-contract-check.mjs
scripts/demo-contract.json
scripts/demo-sdk-contract.json
scripts/dev.mjs
scripts/gen-openapi.mjs
scripts/gen-sdk.mjs
scripts/gen-sqlhydra.sh
scripts/lib.mjs
scripts/negative-control.mjs
scripts/package-source.mjs
scripts/release-smoke.mjs
scripts/shadcn-add.mjs
scripts/sqlite-backup-check.mjs
scripts/store-registration-negative.mjs
scripts/structure-check.mjs
scripts/test.mjs
sqlhydra.toml
src/Composition/Fsso.Composition/Composition.fs
src/Composition/Fsso.Composition/Fsso.Composition.fsproj
src/Composition/Fsso.Composition/SqliteUnitOfWork.fs
src/Composition/Fsso.Composition/SqliteWorkScope.fs
src/Host/Fsso.Host.fsproj
src/Host/Program.fs
src/Modules/Demo/Api/DemoDtos.fs
src/Modules/Demo/Api/DemoEndpoints.fs
src/Modules/Demo/Api/DemoModule.fs
src/Modules/Demo/Api/DemoOpenApi.fs
src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj
src/Modules/Demo/Application/Commands/CreateDemoCommand.fs
src/Modules/Demo/Application/Commands/DeleteDemoCommand.fs
src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj
src/Modules/Demo/Application/Handlers/CreateDemoHandler.fs
src/Modules/Demo/Application/Handlers/DeleteDemoHandler.fs
src/Modules/Demo/Application/Handlers/GetDemoHandler.fs
src/Modules/Demo/Application/Handlers/ListDemosHandler.fs
src/Modules/Demo/Application/Ports.fs
src/Modules/Demo/Application/Queries/GetDemoQuery.fs
src/Modules/Demo/Application/Queries/ListDemosQuery.fs
src/Modules/Demo/Domain/Demo.fs
src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj
src/Modules/Demo/Infrastructure/DemoMigrations.fs
src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj
src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql
src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql
src/Modules/Demo/Infrastructure/SqliteDemoStore.fs
src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj
src/Modules/Notes/Api/NoteDtos.fs
src/Modules/Notes/Api/NoteEndpoints.fs
src/Modules/Notes/Api/NotesModule.fs
src/Modules/Notes/Application/Commands/CreateNoteCommand.fs
src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj
src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs
src/Modules/Notes/Application/Handlers/GetNoteHandler.fs
src/Modules/Notes/Application/Ports.fs
src/Modules/Notes/Application/Queries/GetNoteQuery.fs
src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj
src/Modules/Notes/Domain/Note.fs
src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj
src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql
src/Modules/Notes/Infrastructure/NotesMigrations.fs
src/Modules/Notes/Infrastructure/SqliteNoteStore.fs
src/Shared/Fsso.Api/Fsso.Api.fsproj
src/Shared/Fsso.Api/HttpResults.fs
src/Shared/Fsso.Api/ModuleDescriptor.fs
src/Shared/Fsso.Api/OpenApiSupport.fs
src/Shared/Fsso.Api/SharedDtos.fs
src/Shared/Fsso.Database/Db.fs
src/Shared/Fsso.Database/Fsso.Database.fsproj
src/Shared/Fsso.Database/Generated/SqlHydra.fs
src/Shared/Fsso.Database/Migrations.fs
src/Shared/Fsso.Database/Tables.fs
src/Shared/Fsso.SharedKernel/Errors.fs
src/Shared/Fsso.SharedKernel/Faults.fs
src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj
src/Shared/Fsso.SharedKernel/UnitOfWork.fs
tests/Application.Tests/Fsso.Application.Tests.fsproj
tests/Application.Tests/Tests.fs
tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj
tests/Cqrs.Tests/Support.fs
tests/Cqrs.Tests/Tests.fs
tests/Domain.Tests/Fsso.Domain.Tests.fsproj
tests/Domain.Tests/Tests.fs
tests/Integration.Tests/Fsso.Integration.Tests.fsproj
tests/Integration.Tests/HostTests.fs
tests/Integration.Tests/OpenApiTests.fs
tests/Integration.Tests/StoreTests.fs
tests/Integration.Tests/Support.fs
tests/Notes.Tests/Fsso.Notes.Tests.fsproj
tests/Notes.Tests/NotesTests.fs
tests/Notes.Tests/Support.fs
tests/Notes.Tests/TransactionTests.fs
tests/demo-module-files.sha256
tests/original-test-names.json
web/components.json
web/e2e/demo.spec.ts
web/e2e/start-backend.mjs
web/e2e/start-frontend.mjs
web/index.html
web/openapi-ts.config.ts
web/playwright.config.ts
web/postcss.config.js
web/src/App.svelte
web/src/app.css
web/src/lib/api/client.ts
web/src/lib/api/generated/client.gen.ts
web/src/lib/api/generated/client/client.gen.ts
web/src/lib/api/generated/client/index.ts
web/src/lib/api/generated/client/types.gen.ts
web/src/lib/api/generated/client/utils.gen.ts
web/src/lib/api/generated/core/auth.gen.ts
web/src/lib/api/generated/core/bodySerializer.gen.ts
web/src/lib/api/generated/core/params.gen.ts
web/src/lib/api/generated/core/pathSerializer.gen.ts
web/src/lib/api/generated/core/queryKeySerializer.gen.ts
web/src/lib/api/generated/core/serverSentEvents.gen.ts
web/src/lib/api/generated/core/types.gen.ts
web/src/lib/api/generated/core/utils.gen.ts
web/src/lib/api/generated/index.ts
web/src/lib/api/generated/sdk.gen.ts
web/src/lib/api/generated/types.gen.ts
web/src/lib/api/index.ts
web/src/lib/components/ui/alert-dialog/alert-dialog.svelte
web/src/lib/components/ui/alert-dialog/index.ts
web/src/lib/components/ui/badge/badge.svelte
web/src/lib/components/ui/badge/index.ts
web/src/lib/components/ui/button/button.svelte
web/src/lib/components/ui/button/index.ts
web/src/lib/components/ui/card/card-content.svelte
web/src/lib/components/ui/card/card-description.svelte
web/src/lib/components/ui/card/card-footer.svelte
web/src/lib/components/ui/card/card-header.svelte
web/src/lib/components/ui/card/card-title.svelte
web/src/lib/components/ui/card/card.svelte
web/src/lib/components/ui/card/index.ts
web/src/lib/components/ui/input/index.ts
web/src/lib/components/ui/input/input.svelte
web/src/lib/components/ui/skeleton/index.ts
web/src/lib/components/ui/skeleton/skeleton.svelte
web/src/lib/components/ui/textarea/index.ts
web/src/lib/components/ui/textarea/textarea.svelte
web/src/lib/demo-helpers.test.ts
web/src/lib/demo-helpers.ts
web/src/lib/utils.ts
web/src/main.ts
web/src/vite-env.d.ts
web/svelte.config.js
web/tailwind.config.js
web/tsconfig.json
web/vite.config.ts`.trim().split("\n");

const args = process.argv.slice(2);
const options = new Map();
const switches = new Set();
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (["--phase", "--baseline-dir", "--baseline-index", "--baseline-manifest", "--write-baseline-index"].includes(key)) {
    options.set(key, args[index + 1]);
    index += 1;
  } else if (key.startsWith("--")) {
    switches.add(key);
  }
}
const phase = options.get("--phase") ?? "full";
if (!["config", "backend", "frontend", "full"].includes(phase)) {
  console.error(`comment-equivalence-check: unknown --phase ${phase}; expected config, backend, frontend, or full`);
  process.exit(2);
}
const baselineDir = options.get("--baseline-dir");
let baselineIndexPath = options.get("--baseline-index") ?? options.get("--baseline-manifest");
const writeIndexPath = options.get("--write-baseline-index");
const diagnosticMissingBaseline = switches.has("--diagnostic-missing-baseline");

const posix = (value) => value.split(sep).join("/");

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) files.push(posix(relative(root, absolute)));
    else if (entry.isSymbolicLink()) {
      try {
        if (statSync(absolute).isFile()) files.push(posix(relative(root, absolute)));
      } catch {
        files.push(posix(relative(root, absolute)));
      }
    }
  }
  return files;
}

function configFiles() {
  const files = new Set([".gitignore", "Directory.Build.props", "FssoStack.slnx", "sqlhydra.toml"]);
  for (const name of readdirSync(resolve(root, "scripts"))) {
    if (name.endsWith(".mjs") || name === "gen-sqlhydra.sh") files.add(`scripts/${name}`);
  }
  for (const path of [...walk(resolve(root, "src")), ...walk(resolve(root, "tests"))]) {
    if (path.endsWith(".fsproj")) files.add(path);
  }
  for (const name of ["index.html", "openapi-ts.config.ts", "playwright.config.ts", "postcss.config.js", "svelte.config.js", "tailwind.config.js", "vite.config.ts"]) {
    if (existsSync(resolve(root, "web", name))) files.add(`web/${name}`);
  }
  return [...files].sort();
}

function backendFiles() {
  return walk(resolve(root, "src"))
    .filter((path) => (path.endsWith(".fs") || path.endsWith(".sql")) && !path.endsWith("/Generated/SqlHydra.fs"))
    .sort();
}

function frontendFiles() {
  const webFiles = walk(resolve(root, "web")).filter((path) => {
    if (!/\.(svelte|css|ts|mjs|js)$/.test(path)) return false;
    if (path.startsWith("web/dist/")) return false;
    if (path.startsWith("web/src/lib/api/generated/")) return false;
    if (path.startsWith("web/src/lib/components/ui/")) return false;
    if (path === "web/src/lib/utils.ts") return false;
    return true;
  });
  const testFiles = walk(resolve(root, "tests")).filter((path) => path.endsWith(".fs"));
  return [...new Set([...webFiles, ...testFiles])].sort();
}

function inPhase(path, target) {
  if (target === "full") return inPhase(path, "config") || inPhase(path, "backend") || inPhase(path, "frontend");
  if (target === "config") {
    if ([".gitignore", "Directory.Build.props", "FssoStack.slnx", "sqlhydra.toml"].includes(path)) return true;
    if (path.startsWith("scripts/") && (path.endsWith(".mjs") || path === "scripts/gen-sqlhydra.sh")) return true;
    if (path.endsWith(".fsproj")) return true;
    return ["web/index.html", "web/openapi-ts.config.ts", "web/playwright.config.ts", "web/postcss.config.js", "web/svelte.config.js", "web/tailwind.config.js", "web/vite.config.ts"].includes(path);
  }
  if (target === "backend") {
    return path.startsWith("src/") && (path.endsWith(".fs") || path.endsWith(".sql")) && !path.endsWith("/Generated/SqlHydra.fs");
  }
  if (target === "frontend") {
    if (path.startsWith("tests/") && path.endsWith(".fs")) return true;
    if (!/\.(svelte|css|ts|mjs|js)$/.test(path)) return false;
    if (path.startsWith("web/src/lib/api/generated/")) return false;
    if (path.startsWith("web/src/lib/components/ui/")) return false;
    if (path === "web/src/lib/utils.ts") return false;
    return path.startsWith("web/");
  }
  return false;
}

class LineBuilder {
  constructor() {
    this.lines = [];
    this.current = "";
    this.hasCode = false;
    this.hasString = false;
    this.hadComment = false;
  }

  code(value) {
    this.current += value;
    if (!/\s/.test(value)) this.hasCode = true;
  }

  string(value) {
    this.current += value;
    this.hasString = true;
  }

  commentStartInline() {
    if (this.hasCode || this.hasString) this.current = this.current.replace(/[ \t]+$/, "");
    this.hadComment = true;
  }

  newline(protectedLine = false) {
    const keep = protectedLine || this.hasString || this.hasCode || this.current.trim() !== "" || !this.hadComment;
    if (keep) this.lines.push(this.current);
    this.current = "";
    this.hasCode = false;
    this.hasString = false;
    this.hadComment = false;
  }

  finish(text) {
    if (this.current.length > 0 || this.hasString || this.hasCode) {
      if (this.current.trim() !== "" || this.hasString || this.hasCode || !this.hadComment) this.lines.push(this.current);
    }
    let output = this.lines.join("\n");
    if (text.endsWith("\n") && (this.lines.length > 0 || this.current.length > 0)) output += "\n";
    return output;
  }
}

function stripFSharp(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    if (text.startsWith("//", index)) {
      builder.commentStartInline();
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (text.startsWith("(*", index)) {
      builder.commentStartInline();
      let depth = 1;
      index += 2;
      while (index < text.length && depth > 0) {
        if (text.startsWith("(*", index)) {
          depth += 1;
          index += 2;
        } else if (text.startsWith("*)", index)) {
          depth -= 1;
          index += 2;
        } else {
          if (text[index] === "\n") builder.newline(false);
          index += 1;
        }
      }
      continue;
    }
    if (text.startsWith('"""', index)) {
      builder.string('"""');
      index += 3;
      while (index < text.length) {
        if (text.startsWith('"""', index)) {
          builder.string('"""');
          index += 3;
          break;
        }
        if (text[index] === "\n") {
          builder.newline(true);
          index += 1;
        } else {
          builder.string(text[index]);
          index += 1;
        }
      }
      continue;
    }
    if (text.startsWith('@"', index)) {
      builder.string('@"');
      index += 2;
      while (index < text.length) {
        if (text[index] === '"' && text[index + 1] === '"') {
          builder.string('""');
          index += 2;
          continue;
        }
        if (text[index] === '"') {
          builder.string('"');
          index += 1;
          break;
        }
        if (text[index] === "\n") {
          builder.newline(true);
          index += 1;
        } else {
          builder.string(text[index]);
          index += 1;
        }
      }
      continue;
    }
    if (text[index] === '"') {
      builder.string('"');
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          builder.string(text[index]);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (text[index] === '"') {
          builder.string('"');
          index += 1;
          break;
        }
        if (text[index] === "\n") {
          builder.newline(true);
          index += 1;
        } else {
          builder.string(text[index]);
          index += 1;
        }
      }
      continue;
    }
    if (text[index] === "'") {
      const charLiteral = /^'(\\.|[^'\\\n])'/.exec(text.slice(index));
      if (charLiteral) {
        builder.string(charLiteral[0]);
        index += charLiteral[0].length;
        continue;
      }
    }
    if (text[index] === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(text[index]);
    index += 1;
  }
  return builder.finish(text);
}

function regexAllowed(lastSignificant, lastWord) {
  if (!lastSignificant) return true;
  if (/[([{=,:;!&|?+\-*%^~<>]/.test(lastSignificant)) return true;
  return ["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "do", "else", "case", "yield", "await"].includes(lastWord);
}

function stripJsLike(text) {
  const builder = new LineBuilder();
  const stack = [{ type: "code", depth: 0, templateExpression: false }];
  let index = 0;
  let lastSignificant = "";
  let lastWord = "";
  while (index < text.length) {
    const mode = stack[stack.length - 1];
    if (mode.type === "template") {
      if (text[index] === "\\") {
        builder.string(text[index]);
        index += 1;
        if (index < text.length) {
          builder.string(text[index]);
          index += 1;
        }
        continue;
      }
      if (text[index] === "`") {
        builder.string("`");
        index += 1;
        stack.pop();
        lastSignificant = "`";
        lastWord = "";
        continue;
      }
      if (text.startsWith("${", index)) {
        builder.string("${");
        index += 2;
        stack.push({ type: "code", depth: 1, templateExpression: true });
        lastSignificant = "{";
        lastWord = "";
        continue;
      }
      if (text[index] === "\n") {
        builder.newline(true);
        index += 1;
        continue;
      }
      builder.string(text[index]);
      index += 1;
      continue;
    }
    if (text.startsWith("//", index)) {
      builder.commentStartInline();
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (text.startsWith("/*", index)) {
      builder.commentStartInline();
      index += 2;
      while (index < text.length && !text.startsWith("*/", index)) {
        if (text[index] === "\n") builder.newline(false);
        index += 1;
      }
      if (index < text.length) index += 2;
      continue;
    }
    const char = text[index];
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      lastSignificant = "";
      lastWord = "";
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      builder.string(quote);
      index += 1;
      while (index < text.length) {
        const inner = text[index];
        if (inner === "\\") {
          builder.string(inner);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (inner === quote) {
          builder.string(inner);
          index += 1;
          break;
        }
        if (inner === "\n") {
          builder.newline(true);
          index += 1;
          continue;
        }
        builder.string(inner);
        index += 1;
      }
      lastSignificant = quote;
      lastWord = "";
      continue;
    }
    if (char === "`") {
      builder.string("`");
      index += 1;
      stack.push({ type: "template" });
      lastSignificant = "`";
      lastWord = "";
      continue;
    }
    if (char === "}" && mode.templateExpression && mode.depth === 1) {
      builder.code("}");
      index += 1;
      stack.pop();
      lastSignificant = "}";
      lastWord = "";
      continue;
    }
    if (char === "{") {
      if (mode.templateExpression) mode.depth += 1;
      builder.code(char);
      index += 1;
      lastSignificant = char;
      lastWord = "";
      continue;
    }
    if (char === "}") {
      if (mode.templateExpression) mode.depth -= 1;
      builder.code(char);
      index += 1;
      lastSignificant = char;
      lastWord = "";
      continue;
    }
    if (char === "/" && regexAllowed(lastSignificant, lastWord)) {
      builder.string("/");
      index += 1;
      let inClass = false;
      while (index < text.length) {
        const inner = text[index];
        if (inner === "\\") {
          builder.string(inner);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (inner === "[") inClass = true;
        else if (inner === "]") inClass = false;
        builder.string(inner);
        index += 1;
        if (inner === "/" && !inClass) break;
        if (inner === "\n") break;
      }
      while (index < text.length && /[a-z]/i.test(text[index])) {
        builder.string(text[index]);
        index += 1;
      }
      lastSignificant = "/";
      lastWord = "";
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      let word = "";
      while (index < text.length && /[A-Za-z0-9_$]/.test(text[index])) {
        word += text[index];
        builder.code(text[index]);
        index += 1;
      }
      lastWord = word;
      lastSignificant = word[word.length - 1];
      continue;
    }
    builder.code(char);
    if (!/\s/.test(char)) {
      lastSignificant = char;
      lastWord = "";
    }
    index += 1;
  }
  return builder.finish(text);
}

function stripXml(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    if (text.startsWith("<![CDATA[", index)) {
      builder.string("<![CDATA[");
      index += 9;
      while (index < text.length) {
        if (text.startsWith("]]>", index)) {
          builder.string("]]>");
          index += 3;
          break;
        }
        if (text[index] === "\n") {
          builder.newline(true);
          index += 1;
        } else {
          builder.string(text[index]);
          index += 1;
        }
      }
      continue;
    }
    if (text.startsWith("<!--", index)) {
      builder.commentStartInline();
      index += 4;
      while (index < text.length && !text.startsWith("-->", index)) {
        if (text[index] === "\n") builder.newline(false);
        index += 1;
      }
      if (index < text.length) index += 3;
      continue;
    }
    if (text.startsWith("{/*", index)) {
      builder.commentStartInline();
      index += 3;
      while (index < text.length && !text.startsWith("*/}", index)) {
        if (text[index] === "\n") builder.newline(false);
        index += 1;
      }
      if (index < text.length) index += 3;
      continue;
    }
    if (text[index] === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(text[index]);
    index += 1;
  }
  return builder.finish(text);
}

function stripSql(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "'" || char === '"') {
      const quote = char;
      builder.string(quote);
      index += 1;
      while (index < text.length) {
        if (text[index] === quote && text[index + 1] === quote) {
          builder.string(`${quote}${quote}`);
          index += 2;
          continue;
        }
        if (text[index] === quote) {
          builder.string(quote);
          index += 1;
          break;
        }
        if (text[index] === "\n") builder.newline(true);
        else builder.string(text[index]);
        index += 1;
      }
      continue;
    }
    if (text.startsWith("--", index)) {
      builder.commentStartInline();
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (text.startsWith("/*", index)) {
      builder.commentStartInline();
      index += 2;
      while (index < text.length && !text.startsWith("*/", index)) {
        if (text[index] === "\n") builder.newline(false);
        index += 1;
      }
      if (index < text.length) index += 2;
      continue;
    }
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(char);
    index += 1;
  }
  return builder.finish(text);
}

function stripCss(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "'" || char === '"') {
      const quote = char;
      builder.string(quote);
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          builder.string(text[index]);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (text[index] === quote) {
          builder.string(quote);
          index += 1;
          break;
        }
        if (text[index] === "\n") builder.newline(true);
        else builder.string(text[index]);
        index += 1;
      }
      continue;
    }
    if (text.startsWith("/*", index)) {
      builder.commentStartInline();
      index += 2;
      while (index < text.length && !text.startsWith("*/", index)) {
        if (text[index] === "\n") builder.newline(false);
        index += 1;
      }
      if (index < text.length) index += 2;
      continue;
    }
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(char);
    index += 1;
  }
  return builder.finish(text);
}

function stripToml(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "#") {
      builder.commentStartInline();
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (text.startsWith('"""', index) || text.startsWith("'''", index)) {
      const delimiter = text.slice(index, index + 3);
      builder.string(delimiter);
      index += 3;
      while (index < text.length) {
        if (text.startsWith(delimiter, index)) {
          builder.string(delimiter);
          index += 3;
          break;
        }
        if (text[index] === "\n") {
          builder.newline(true);
          index += 1;
        } else {
          builder.string(text[index]);
          index += 1;
        }
      }
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      builder.string(quote);
      index += 1;
      while (index < text.length) {
        if (quote === '"' && text[index] === "\\") {
          builder.string(text[index]);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (text[index] === quote) {
          builder.string(quote);
          index += 1;
          break;
        }
        if (text[index] === "\n") builder.newline(true);
        else builder.string(text[index]);
        index += 1;
      }
      continue;
    }
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(char);
    index += 1;
  }
  return builder.finish(text);
}

function stripGitignore(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "#" && !builder.hasCode && !builder.hasString) {
      builder.commentStartInline();
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(char);
    index += 1;
  }
  return builder.finish(text);
}

function stripShell(text) {
  const builder = new LineBuilder();
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "'" || char === '"') {
      const quote = char;
      builder.string(quote);
      index += 1;
      while (index < text.length) {
        if (quote === '"' && text[index] === "\\") {
          builder.string(text[index]);
          index += 1;
          if (index < text.length) {
            builder.string(text[index]);
            index += 1;
          }
          continue;
        }
        if (text[index] === quote) {
          builder.string(quote);
          index += 1;
          break;
        }
        if (text[index] === "\n") builder.newline(true);
        else builder.string(text[index]);
        index += 1;
      }
      continue;
    }
    const lineStart = index === 0 || text[index - 1] === "\n";
    const afterWhitespace = lineStart || /\s/.test(text[index - 1]);
    if (char === "#" && afterWhitespace) {
      const lineEnd = text.indexOf("\n", index);
      const stop = lineEnd === -1 ? text.length : lineEnd;
      const line = text.slice(index, stop);
      if (line.startsWith("#!")) {
        builder.code(line);
      } else {
        builder.commentStartInline();
      }
      index = stop;
      continue;
    }
    if (char === "\n") {
      builder.newline(false);
      index += 1;
      continue;
    }
    builder.code(char);
    index += 1;
  }
  return builder.finish(text);
}

function stripSvelte(text) {
  let output = "";
  let index = 0;
  while (index < text.length) {
    const script = text.indexOf("<script", index);
    const style = text.indexOf("<style", index);
    const candidates = [script, style].filter((value) => value !== -1);
    const next = candidates.length ? Math.min(...candidates) : -1;
    if (next === -1) {
      output += stripXml(text.slice(index));
      break;
    }
    output += stripXml(text.slice(index, next));
    if (next === script) {
      const openEnd = text.indexOf(">", next);
      if (openEnd === -1) {
        output += text.slice(next);
        break;
      }
      output += text.slice(next, openEnd + 1);
      const close = text.indexOf("</script>", openEnd + 1);
      const bodyEnd = close === -1 ? text.length : close;
      output += stripJsLike(text.slice(openEnd + 1, bodyEnd));
      if (close === -1) break;
      output += "</script>";
      index = close + "</script>".length;
    } else {
      const openEnd = text.indexOf(">", next);
      if (openEnd === -1) {
        output += text.slice(next);
        break;
      }
      output += text.slice(next, openEnd + 1);
      const close = text.indexOf("</style>", openEnd + 1);
      const bodyEnd = close === -1 ? text.length : close;
      output += stripCss(text.slice(openEnd + 1, bodyEnd));
      if (close === -1) break;
      output += "</style>";
      index = close + "</style>".length;
    }
  }
  return output;
}

function canonicalText(path, text) {
  if (path.endsWith(".fs")) return stripFSharp(text);
  if (/\.(mjs|js|cjs|ts|tsx)$/.test(path)) return stripJsLike(text);
  if (path.endsWith(".svelte")) return stripSvelte(text);
  if (/\.(html|xml|fsproj|slnx|props)$/.test(path)) return stripXml(text);
  if (path.endsWith(".sql")) return stripSql(text);
  if (path.endsWith(".css")) return stripCss(text);
  if (path.endsWith(".toml")) return stripToml(text);
  if (path === ".gitignore") return stripGitignore(text);
  if (path.endsWith(".sh")) return stripShell(text);
  return text;
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function gitShow(path) {
  return execFileSync("git", ["show", `${BASELINE}:${path}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function firstDifference(expected, actual) {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const limit = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < limit; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      return `line ${index + 1}: baseline ${JSON.stringify(expectedLines[index] ?? "")} current ${JSON.stringify(actualLines[index] ?? "")}`;
    }
  }
  return "canonical content differs";
}

function baselineDecision(available, diagnostic) {
  if (available) return "VERIFY";
  return diagnostic ? "NOT_VERIFIED" : "FAIL";
}

function fileDecision(exists, isBaseline) {
  if (!exists && isBaseline) return "FAIL_MISSING_FILE";
  if (!exists) return "SKIP_NEW_MISSING";
  return "VERIFY";
}

function entryDecision(hasText, hasHash) {
  return hasText || hasHash ? "VERIFY" : "FAIL_MISSING_ENTRY";
}

function runSelfTests() {
  const checks = [];
  const expect = (label, condition) => checks.push({ label, ok: Boolean(condition) });
  const jsCommentOnly = canonicalText("sample.mjs", "const value = 1;\n") === canonicalText("sample.mjs", "// 注释\nconst value = 1;\n");
  expect("JS comment-only insertion accepted", jsCommentOnly);
  const jsTokenChanged = canonicalText("sample.mjs", "const value = 1;\n") !== canonicalText("sample.mjs", "const value = 2;\n");
  expect("JS token tampering detected", jsTokenChanged);
  const fsharpIndentChanged =
    canonicalText("sample.fs", "let run () =\n    let value = 1\n    value\n") !==
    canonicalText("sample.fs", "let run () =\n  let value = 1\n  value\n");
  expect("F# offside indentation change detected", fsharpIndentChanged);
  const multilineStringChanged =
    canonicalText("sample.fs", 'let text = """line\n  kept"""\n') !==
    canonicalText("sample.fs", 'let text = """line\n    kept"""\n');
  expect("F# triple-string content change detected", multilineStringChanged);
  const regexComment = canonicalText("sample.mjs", "const pattern = /a\\/\\/b/g;\n") === canonicalText("sample.mjs", "// 注释\nconst pattern = /a\\/\\/b/g;\n");
  expect("JS regex literal comment-like text preserved", regexComment);
  const regexChanged = canonicalText("sample.mjs", "const pattern = /a\\/\\/b/g;\n") !== canonicalText("sample.mjs", "const pattern = /a\\/\\/c/g;\n");
  expect("JS regex literal change detected", regexChanged);
  const templateNested =
    canonicalText("sample.ts", "const value = `a ${ { text: \"// not comment\" }.text } b`;\n") !==
    canonicalText("sample.ts", "const value = `a ${ { text: \"// not comment\" }.text } c`;\n");
  expect("JS template nested expression change detected", templateNested);
  const templateComment =
    canonicalText("sample.ts", "const value = `a ${ 1 /* note */ } b`;\n") ===
    canonicalText("sample.ts", "const value = `a ${ 1 } b`;\n");
  expect("JS template expression comment stripped", templateComment);
  const cdataPreserved = canonicalText("sample.xml", "<root><![CDATA[<!-- not a comment -->]]></root>\n") === "<root><![CDATA[<!-- not a comment -->]]></root>\n";
  expect("XML CDATA content preserved", cdataPreserved);
  const cdataChanged = canonicalText("sample.xml", "<root><![CDATA[a]]></root>\n") !== canonicalText("sample.xml", "<root><![CDATA[b]]></root>\n");
  expect("XML CDATA change detected", cdataChanged);
  const svelteScript =
    canonicalText("sample.svelte", "<script>\n// note\nlet value = 1;\n</script>\n") ===
    canonicalText("sample.svelte", "<script>\nlet value = 1;\n</script>\n");
  expect("Svelte script comment stripped", svelteScript);
  const svelteTopComment =
    canonicalText("sample.svelte", "<!-- 文件职责：测试顶层注释 -->\n<script>\nlet value = 1;\n</script>\n") ===
    canonicalText("sample.svelte", "<script>\nlet value = 1;\n</script>\n");
  expect("Svelte top-level header comment accepted", svelteTopComment);
  const svelteStyleComment =
    canonicalText("sample.svelte", "<style>\n/* 文件职责：测试样式注释 */\n.a { color: red; }\n</style>\n") ===
    canonicalText("sample.svelte", "<style>\n.a { color: red; }\n</style>\n");
  expect("Svelte style header comment accepted", svelteStyleComment);
  const markupChanged =
    canonicalText("sample.svelte", "<!-- note -->\n<div>a</div>\n") !==
    canonicalText("sample.svelte", "<!-- note -->\n<div>b</div>\n");
  expect("Svelte markup change detected", markupChanged);
  const svelteIndent =
    canonicalText("sample.svelte", "<script>\n  let value = 1;\n</script>\n") !==
    canonicalText("sample.svelte", "<script>\n    let value = 1;\n</script>\n");
  expect("Svelte script indentation change detected", svelteIndent);
  expect("missing baseline fails closed", baselineDecision(false, false) === "FAIL");
  expect("diagnostic missing baseline is NOT_VERIFIED", baselineDecision(false, true) === "NOT_VERIFIED");
  expect("missing baseline member fails closed", fileDecision(false, true) === "FAIL_MISSING_FILE");
  expect("missing baseline entry fails closed", entryDecision(false, false) === "FAIL_MISSING_ENTRY");
  return checks;
}

const selfChecks = runSelfTests();
const selfFailures = selfChecks.filter((check) => !check.ok);
if (selfFailures.length) {
  for (const check of selfFailures) console.error(`comment-equivalence-check: negative control failed: ${check.label}`);
  console.error("comment-equivalence-check: FAIL (self-test negative control)");
  process.exit(1);
}
if (switches.has("--self-test")) {
  for (const check of selfChecks) console.log(`comment-equivalence-check: self-test OK ${check.label}`);
  console.log(`comment-equivalence-check: self-test OK (${selfChecks.length} targeted negative controls passed)`);
  process.exit(0);
}

let gitBaseline = false;
try {
  if (!isRepoRoot()) throw new Error("not a git worktree root");
  gitShow("package.json");
  gitBaseline = true;
} catch {
  gitBaseline = false;
}
if (!gitBaseline && !baselineDir && !baselineIndexPath && existsSync(resolve(root, DEFAULT_INDEX))) {
  baselineIndexPath = DEFAULT_INDEX;
}
const baselineIndex = baselineIndexPath && existsSync(resolve(root, baselineIndexPath))
  ? JSON.parse(readFileSync(resolve(root, baselineIndexPath), "utf8"))
  : null;
const baselineAvailable = gitBaseline || Boolean(baselineDir) || Boolean(baselineIndex);
const baselinePathSet = new Set(BASELINE_PATHS);

function baselineText(path) {
  if (gitBaseline) {
    try {
      return gitShow(path);
    } catch {
      return null;
    }
  }
  if (baselineDir) {
    const file = resolve(root, baselineDir, path);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
  }
  return null;
}

function baselineHash(path) {
  if (baselineIndex?.files?.[path]) return baselineIndex.files[path];
  return null;
}

const phases = { config: configFiles, backend: backendFiles, frontend: frontendFiles };
const currentFiles = phase === "full"
  ? [...new Set([...configFiles(), ...backendFiles(), ...frontendFiles()])].sort()
  : phases[phase]();
const baselinePhasePaths = BASELINE_PATHS.filter((path) => inPhase(path, phase));
const files = [...new Set([...currentFiles, ...baselinePhasePaths])].sort();

const results = [];
const failures = [];

if (writeIndexPath) {
  if (!gitBaseline) {
    console.error("comment-equivalence-check: --write-baseline-index requires the git baseline");
    process.exit(1);
  }
  const index = { baseline: BASELINE, mode: "comment-stripped-canonical-sha256", paths: baselinePhasePaths.slice().sort(), files: {} };
  for (const path of baselinePhasePaths) {
    const baseline = baselineText(path);
    if (baseline === null) {
      console.error(`comment-equivalence-check: baseline is missing for ${path}; cannot write a complete index`);
      process.exit(1);
    }
    index.files[path] = hashText(canonicalText(path, baseline));
  }
  writeFileSync(resolve(root, writeIndexPath), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`comment-equivalence-check: wrote ${Object.keys(index.files).length} baseline hashes for phase=${phase} to ${writeIndexPath}`);
  process.exit(0);
}

for (const path of files) {
  const absolute = resolve(root, path);
  const isBaseline = baselinePathSet.has(path);
  const exists = existsSync(absolute);
  const decision = fileDecision(exists, isBaseline);
  if (decision === "FAIL_MISSING_FILE") {
    results.push({ path, status: "MISSING_FILE", detail: "baseline member is missing from the working tree" });
    failures.push(`${path}: baseline member is missing from the working tree`);
    continue;
  }
  if (decision === "SKIP_NEW_MISSING") {
    results.push({ path, status: "SKIP", detail: "new deliverable is not present" });
    continue;
  }
  if (!isBaseline) {
    if (NEW_FILES.includes(path)) {
      results.push({ path, status: "NEW", detail: "listed new deliverable has no baseline entry" });
    } else {
      results.push({ path, status: "UNEXPECTED_NEW", detail: "new file is not in the declared deliverable list" });
      failures.push(`${path}: new file is not in the declared deliverable list`);
    }
    continue;
  }
  const baselineStatus = baselineDecision(baselineAvailable, diagnosticMissingBaseline);
  if (baselineStatus === "FAIL") {
    results.push({ path, status: "MISSING_BASELINE", detail: "no git baseline, baseline directory, or baseline index supplied" });
    failures.push(`${path}: no baseline is available; full acceptance is fail-closed`);
    continue;
  }
  if (baselineStatus === "NOT_VERIFIED") {
    results.push({ path, status: "NOT_VERIFIED", detail: "diagnostic mode without a baseline; not acceptable as equivalence evidence" });
    continue;
  }
  const current = readFileSync(absolute, "utf8");
  const expected = baselineText(path);
  const expectedHash = baselineHash(path);
  if (entryDecision(expected !== null, expectedHash !== null) === "FAIL_MISSING_ENTRY") {
    results.push({ path, status: "MISSING_ENTRY", detail: "baseline input has no entry for this baseline member" });
    failures.push(`${path}: baseline input has no entry for this baseline member`);
    continue;
  }
  const currentCanonical = canonicalText(path, current);
  if (expected !== null) {
    const expectedCanonical = canonicalText(path, expected);
    if (expectedCanonical === currentCanonical) {
      results.push({ path, status: "OK", detail: "comment-stripped canonical text matches" });
    } else {
      const detail = firstDifference(expectedCanonical, currentCanonical);
      results.push({ path, status: "FAIL", detail });
      failures.push(`${path}: ${detail}`);
    }
    continue;
  }
  if (hashText(currentCanonical) === expectedHash) {
    results.push({ path, status: "OK", detail: "comment-stripped canonical hash matches" });
  } else {
    results.push({ path, status: "FAIL", detail: "comment-stripped canonical hash differs" });
    failures.push(`${path}: comment-stripped canonical hash differs from the baseline index`);
  }
}

for (const result of results) {
  console.log(`comment-equivalence-check: ${result.status} ${result.path} (${result.detail})`);
}
if (failures.length) {
  for (const failure of failures) console.error(`comment-equivalence-check: ${failure}`);
  console.error(`comment-equivalence-check: FAIL (${failures.length} issue(s) across ${files.length} files; phase=${phase})`);
  process.exit(1);
}

const notVerified = results.filter((item) => item.status === "NOT_VERIFIED").length;
const counts = {
  ok: results.filter((item) => item.status === "OK").length,
  newFiles: results.filter((item) => item.status === "NEW").length,
  skipped: results.filter((item) => item.status === "SKIP").length,
  notVerified,
};
const mode = gitBaseline
  ? `git ${BASELINE}`
  : baselineDir
    ? `baseline dir ${baselineDir}`
    : baselineIndex
      ? `baseline index ${baselineIndexPath}`
      : "no baseline";
if (notVerified > 0) {
  console.log(
    `comment-equivalence-check: NOT_VERIFIED (${notVerified} files; diagnostic missing baseline; NOT acceptance evidence; phase=${phase}; mode=${mode}; negative controls passed)`
  );
  process.exit(0);
}
console.log(
  `comment-equivalence-check: OK (${files.length} files; OK=${counts.ok} NEW=${counts.newFiles} SKIP=${counts.skipped}; phase=${phase}; baseline=${mode}; negative controls passed)`
);
