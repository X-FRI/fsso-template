// 文件职责：校验各层项目引用方向、禁止命名空间、Host 与模块 Api 边界、迁移版本和 33 文件派生清单，并生成临时违规夹具确认断言有效；按父级澄清只增加本注释，检查逻辑与既有断言保持原样。
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  collectApiSymbols,
  collectDemoApiSymbols,
  hostBoundaryViolations,
  moduleBoundaryViolations,
  root,
  stripFSharpComments,
} from "./lib.mjs";

const MANIFEST = "tests/demo-module-files.sha256";
const OPENAPI_TEST = "tests/Integration.Tests/OpenApiTests.fs";
const MANIFEST_PREFIXES = [
  "src/Modules/Demo/",
  "tests/Domain.Tests/",
  "tests/Application.Tests/",
  "tests/Integration.Tests/",
  "tests/Cqrs.Tests/",
];

const expectedEdges = {
  "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj": [],
  "src/Shared/Fsso.Database/Fsso.Database.fsproj": ["src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj"],
  "src/Shared/Fsso.Api/Fsso.Api.fsproj": ["src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj"],
  "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj": [],
  "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  ],
  "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
  ],
  "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Api/Fsso.Api.fsproj",
  ],
  "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj": [],
  "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj": [
    "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  ],
  "src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj": [
    "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
    "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
  ],
  "src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj": [
    "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
    "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Api/Fsso.Api.fsproj",
  ],
  "src/Composition/Fsso.Composition/Fsso.Composition.fsproj": [
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
    "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
    "src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
  ],
  "src/Host/Fsso.Host.fsproj": [
    "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
    "src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj",
    "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
    "src/Shared/Fsso.Api/Fsso.Api.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  ],
  "tests/Domain.Tests/Fsso.Domain.Tests.fsproj": ["src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj"],
  "tests/Application.Tests/Fsso.Application.Tests.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
  ],
  "tests/Integration.Tests/Fsso.Integration.Tests.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
    "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
    "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
    "src/Host/Fsso.Host.fsproj",
  ],
  "tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj": [
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
    "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
    "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
    "src/Host/Fsso.Host.fsproj",
  ],
  "tests/Notes.Tests/Fsso.Notes.Tests.fsproj": [
    "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj",
    "src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj",
    "src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj",
    "src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj",
    "src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj",
    "src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj",
    "src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj",
    "src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj",
    "src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj",
    "src/Shared/Fsso.Database/Fsso.Database.fsproj",
    "src/Composition/Fsso.Composition/Fsso.Composition.fsproj",
    "src/Host/Fsso.Host.fsproj",
  ],
};

function posix(path) {
  return path.split(sep).join("/");
}

function gitTopLevel(repoRoot) {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return resolve(top);
  } catch {
    return null;
  }
}

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "bin" || entry.name === "obj" || entry.name === "node_modules") continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function projectReferences(projectPath, repoRoot) {
  const text = readFileSync(resolve(repoRoot, projectPath), "utf8");
  return [...text.matchAll(/<ProjectReference\s+Include="([^"]+)"/g)].map((match) =>
    posix(relative(repoRoot, resolve(dirname(resolve(repoRoot, projectPath)), match[1])))
  );
}

function projectSourceFiles(projectPath, repoRoot) {
  const directory = dirname(resolve(repoRoot, projectPath));
  return walk(directory).filter((file) => file.endsWith(".fs"));
}

function namespaceUsed(text, namespace) {
  const escaped = namespace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(?![A-Za-z0-9_'])`).test(text);
}

function migrationVersionsFromDescriptor(descriptorPath, repoRoot) {
  const text = stripFSharpComments(readFileSync(resolve(repoRoot, descriptorPath), "utf8"));
  const match = text.match(/MigrationVersions\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return null;
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]).sort();
}

function actualMigrationVersions(moduleName, repoRoot) {
  const directory = resolve(repoRoot, "src/Modules", moduleName, "Infrastructure/Migrations");
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.slice(0, -".sql".length))
    .sort();
}

function checkMigrationVersions(repoRoot, failures) {
  const modulesRoot = resolve(repoRoot, "src/Modules");
  if (!existsSync(modulesRoot)) {
    failures.push("src/Modules is missing");
    return;
  }

  for (const entry of readdirSync(modulesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const moduleName = entry.name;
    const apiDirectory = resolve(modulesRoot, moduleName, "Api");
    const actual = actualMigrationVersions(moduleName, repoRoot);
    const descriptors = existsSync(apiDirectory)
      ? readdirSync(apiDirectory).filter((name) => name.endsWith("Module.fs")).sort()
      : [];

    if (descriptors.length === 0) {
      if (actual.length) failures.push(`module ${moduleName} has migrations but no ModuleDescriptor`);
      continue;
    }

    for (const descriptor of descriptors) {
      const descriptorPath = `src/Modules/${moduleName}/Api/${descriptor}`;
      const declared = migrationVersionsFromDescriptor(descriptorPath, repoRoot);
      if (!declared) {
        failures.push(`${descriptorPath} is missing MigrationVersions`);
      } else if (JSON.stringify(declared) !== JSON.stringify(actual)) {
        failures.push(
          `${descriptorPath} MigrationVersions [${declared.join(", ")}] do not match actual migrations [${actual.join(", ")}]`
        );
      }
    }
  }
}

function checkHostBoundaryFixture(repoRoot, failures) {
  const symbols = collectDemoApiSymbols(repoRoot);
  const fixtureSymbols = new Set([...symbols, "DemoResponse", "DemoEndpoints"]);
  const allowed = `
module Synthetic.Program
open Fsso.Demo.Api
let modules = [ DemoModule.descriptor ]
let qualified = Fsso.Demo.Api.DemoModule.descriptor
`;
  const allowedViolations = hostBoundaryViolations(allowed, fixtureSymbols);
  if (allowedViolations.length) {
    failures.push(`Host boundary fixture false positive on allowed DemoModule usage: ${allowedViolations.join("; ")}`);
  }

  const forbidden = `
module Synthetic.Program
open Fsso.Demo.Api
let response: DemoResponse = Unchecked.defaultof<DemoResponse>
let endpoints = DemoEndpoints.map
`;
  const forbiddenViolations = hostBoundaryViolations(forbidden, fixtureSymbols);
  for (const expected of ["DemoResponse", "DemoEndpoints"]) {
    if (!forbiddenViolations.some((item) => item.includes(expected))) {
      failures.push(`Host boundary fixture failed to detect ${expected}`);
    }
  }

  const qualified = `
module Synthetic.Program
let response = Fsso.Demo.Api.DemoResponse
`;
  const qualifiedViolations = hostBoundaryViolations(qualified, new Set(["DemoModule"]));
  if (!qualifiedViolations.some((item) => item.includes("DemoResponse"))) {
    failures.push("Host boundary fixture failed to detect a fully-qualified forbidden Demo.Api type");
  }

  const commented = `
module Synthetic.Program
// DemoResponse and DemoEndpoints are forbidden in Host code
(* Fsso.Demo.Api.DemoResponse and DemoEndpoints *)
let message = "DemoResponse DemoEndpoints Fsso.Demo.Api.DemoResponse"
`;
  const commentedViolations = hostBoundaryViolations(commented, fixtureSymbols);
  if (commentedViolations.length) {
    failures.push(`Host boundary fixture false positive inside comments/strings: ${commentedViolations.join("; ")}`);
  }
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function collectManifestFiles(repoRoot) {
  let paths;
  const inGitRepository = gitTopLevel(repoRoot) === resolve(repoRoot);

  if (inGitRepository) {
    try {
      const listing = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
        cwd: repoRoot,
        encoding: "buffer",
        maxBuffer: 64 * 1024 * 1024,
      });
      paths = listing.toString("utf8").split("\0").filter(Boolean);
    } catch {
      paths = walk(repoRoot).map((file) => posix(relative(repoRoot, file)));
    }
  } else {
    paths = walk(repoRoot).map((file) => posix(relative(repoRoot, file)));
  }
  return paths
    .filter((path) => MANIFEST_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => path !== OPENAPI_TEST)
    .filter((path) => !path.split("/").some((part) => part === "bin" || part === "obj"))
    .sort();
}

export function writeManifest(repoRoot = root) {
  const lines = collectManifestFiles(repoRoot).map((path) => `${sha256File(resolve(repoRoot, path))}  ${path}`);
  writeFileSync(resolve(repoRoot, MANIFEST), `${lines.join("\n")}\n`);
  return lines.length;
}

function checkManifest(repoRoot, failures) {
  const manifestPath = resolve(repoRoot, MANIFEST);
  if (!existsSync(manifestPath)) {
    failures.push(`${MANIFEST} is missing; run architecture-check.mjs --write-manifest`);
    return;
  }
  const expected = new Map();
  for (const line of readFileSync(manifestPath, "utf8").split("\n").filter(Boolean)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      failures.push(`${MANIFEST} has malformed line: ${line}`);
      continue;
    }
    expected.set(match[2], match[1]);
  }
  const actual = collectManifestFiles(repoRoot).filter((path) => !path.endsWith(MANIFEST));
  for (const path of actual) {
    if (!expected.has(path)) {
      failures.push(`Demo/test manifest missing ${path}`);
      continue;
    }
    const hash = sha256File(resolve(repoRoot, path));
    if (hash !== expected.get(path)) failures.push(`Demo/test manifest changed ${path}`);
  }
  for (const path of expected.keys()) {
    if (!actual.includes(path)) failures.push(`Demo/test manifest references missing ${path}`);
  }
}

const FIXTURE_PREFIXES = ["src/", "tests/"];
const FIXTURE_ROOT_FILES = new Set(["Directory.Build.props"]);
const FIXTURE_SKIP_DIRS = new Set([
  ".git",
  ".tools",
  "node_modules",
  "artifacts",
  "bin",
  "obj",
  "test-results",
  "playwright-report",
  "coverage",
  "wwwroot",
  "dist",
]);

function collectFixturePaths(repoRoot) {
  let paths;
  const inGitRepository = gitTopLevel(repoRoot) === resolve(repoRoot);

  if (inGitRepository) {
    try {
      const listing = execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "src", "tests", "Directory.Build.props"],
        { cwd: repoRoot, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }
      );
      paths = listing.toString("utf8").split("\0").filter(Boolean);
    } catch {
      paths = [];
    }
  } else {
    paths = [];
  }

  if (paths.length === 0) {
    const visit = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          if (!FIXTURE_SKIP_DIRS.has(entry.name)) visit(absolute);
        } else {
          paths.push(posix(relative(repoRoot, absolute)));
        }
      }
    };
    visit(repoRoot);
  }

  return paths
    .filter((path) => FIXTURE_ROOT_FILES.has(path) || FIXTURE_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => !path.split("/").some((part) => FIXTURE_SKIP_DIRS.has(part)))
    .sort();
}

function writeForbiddenFixture(repoRoot) {
  const artifactsDirectory = resolve(repoRoot, "artifacts");
  mkdirSync(artifactsDirectory, { recursive: true });

  const canonical = resolve(artifactsDirectory, "architecture-forbidden-fixture");
  let fixture = canonical;
  if (existsSync(canonical)) {
    const stamp = `${Date.now()}-${process.pid}`;
    fixture = resolve(artifactsDirectory, `architecture-forbidden-fixture-${stamp}`);
    let suffix = 0;
    while (existsSync(fixture)) {
      suffix += 1;
      if (suffix > 100) throw new Error(`could not choose a unique forbidden-fixture directory near ${canonical}`);
      fixture = resolve(artifactsDirectory, `architecture-forbidden-fixture-${stamp}-${suffix}`);
    }
  }
  mkdirSync(fixture, { recursive: true });

  for (const path of collectFixturePaths(repoRoot)) {
    const target = resolve(fixture, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(repoRoot, path), target);
  }

  const domainProject = resolve(fixture, "src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj");
  const domainText = readFileSync(domainProject, "utf8");
  writeFileSync(
    domainProject,
    domainText.replace(
      "</Project>",
      '  <ItemGroup>\n    <ProjectReference Include="../../Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj" />\n  </ItemGroup>\n</Project>'
    )
  );

  const applicationPorts = resolve(fixture, "src/Modules/Notes/Application/Ports.fs");
  const portsText = readFileSync(applicationPorts, "utf8");
  writeFileSync(applicationPorts, portsText.replace("namespace Fsso.Notes.Application", "namespace Fsso.Notes.Application\n\nopen Fsso.Infrastructure"));

  return fixture;
}

function verifyForbiddenFixture(repoRoot) {
  const fixture = writeForbiddenFixture(repoRoot);
  let failures = [];

  try {
    checkRepository(fixture);
  } catch (error) {
    failures = error.failures ?? [];
    if (!failures.length) throw error;
  }

  const projectViolation = failures.some(
    (failure) =>
      failure.includes("src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj") &&
      failure.includes("src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj")
  );
  const sourceViolation = failures.some(
    (failure) => failure.includes("src/Modules/Notes/Application/Ports.fs") && failure.includes("Fsso.Infrastructure")
  );

  if (!projectViolation) {
    throw new Error("architecture-check: forbidden fixture did NOT detect Notes.Domain -> Demo.Infrastructure project reference");
  }
  if (!sourceViolation) {
    throw new Error("architecture-check: forbidden fixture did NOT detect Notes.Application -> Fsso.Infrastructure source import");
  }

  return fixture;
}

const forbiddenOpens = {
  "src/Modules/Demo/Domain": ["Fsso.Application", "Fsso.Infrastructure", "Fsso.Database", "Fsso.Demo.Api", "Fsso.Composition", "Fsso.Host"],
  "src/Modules/Demo/Application": ["Fsso.Infrastructure", "Fsso.Database", "Fsso.Demo.Api", "Fsso.Composition", "Fsso.Host"],
  "src/Modules/Demo/Infrastructure": ["Fsso.Demo.Api", "Fsso.Composition", "Fsso.Host"],
  "src/Modules/Demo/Api": ["Fsso.Infrastructure", "Fsso.Database", "Fsso.Composition", "Fsso.Host"],
  "src/Modules/Notes/Domain": [
    "Fsso.Application",
    "Fsso.Infrastructure",
    "Fsso.Database",
    "Fsso.Notes.Application",
    "Fsso.Notes.Infrastructure",
    "Fsso.Notes.Api",
    "Fsso.Demo.Api",
    "Fsso.Domain",
    "Fsso.Composition",
    "Fsso.Host",
  ],
  "src/Modules/Notes/Application": [
    "Fsso.Infrastructure",
    "Fsso.Database",
    "Fsso.Notes.Infrastructure",
    "Fsso.Notes.Api",
    "Fsso.Demo.Api",
    "Fsso.Domain",
    "Fsso.Composition",
    "Fsso.Host",
  ],
  "src/Modules/Notes/Infrastructure": [
    "Fsso.Infrastructure",
    "Fsso.Notes.Api",
    "Fsso.Demo.Api",
    "Fsso.Domain",
    "Fsso.Composition",
    "Fsso.Host",
  ],
  "src/Modules/Notes/Api": [
    "Fsso.Infrastructure",
    "Fsso.Database",
    "Fsso.Notes.Infrastructure",
    "Fsso.Demo.Api",
    "Fsso.Domain",
    "Fsso.Composition",
    "Fsso.Host",
  ],
  "src/Composition/Fsso.Composition": ["Fsso.Demo.Api", "Fsso.Notes.Api", "Fsso.Host"],
  "src/Host": [
    "Fsso.Database",
    "Fsso.Infrastructure",
    "Fsso.Demo.Api.DemoDtos",
    "Fsso.Demo.Api.DemoEndpoints",
    "Fsso.Notes.Infrastructure",
    "Fsso.Notes.Application",
    "Fsso.Notes.Domain",
    "Fsso.Notes.Api.NoteDtos",
    "Fsso.Notes.Api.NoteEndpoints",
  ],
};

export function checkRepository(repoRoot = root) {
  const failures = [];
  const projectPaths = Object.keys(expectedEdges);

  for (const project of projectPaths) {
    const absolute = resolve(repoRoot, project);
    if (!existsSync(absolute)) {
      failures.push(`missing project ${project}`);
      continue;
    }
    const actual = projectReferences(project, repoRoot).sort();
    const expected = expectedEdges[project].slice().sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${project} references [${actual.join(", ")}], expected [${expected.join(", ")}]`);
    }
  }

  for (const [project, forbidden] of Object.entries(forbiddenOpens)) {
    const projectFile = projectPaths.find((path) => path.startsWith(`${project}/`));
    if (!projectFile) continue;
    for (const file of projectSourceFiles(projectFile, repoRoot)) {
      const text = stripFSharpComments(readFileSync(file, "utf8"), { blankStrings: true });
      for (const namespace of forbidden) {
        if (namespaceUsed(text, namespace)) {
          failures.push(
            `${posix(relative(repoRoot, file))} has forbidden source reference to ${namespace}`
          );
        }
      }
    }
  }

  const props = readFileSync(resolve(repoRoot, "Directory.Build.props"), "utf8");
  if (!props.includes("<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>")) {
    failures.push("Directory.Build.props must set DisableTransitiveProjectReferences=true");
  }

  for (const file of ["src/Modules/Demo/Api/DemoEndpoints.fs", "src/Modules/Demo/Api/DemoModule.fs"]) {
    if (!existsSync(resolve(repoRoot, file))) failures.push(`missing ${file}`);
  }

  const demoSymbols = collectDemoApiSymbols(repoRoot);
  const notesSymbols = collectApiSymbols(repoRoot, "Notes");
  for (const file of walk(resolve(repoRoot, "src/Host"))) {
    if (!file.endsWith(".fs")) continue;
    const filePath = posix(relative(repoRoot, file));
    const source = readFileSync(file, "utf8");
    for (const violation of hostBoundaryViolations(source, demoSymbols)) {
      failures.push(`${filePath} ${violation}`);
    }
    for (const violation of moduleBoundaryViolations(
      source,
      "Fsso.Notes.Api",
      notesSymbols,
      new Set(["NotesModule"]),
      ["Fsso.Database", "Fsso.Notes.Infrastructure", "Fsso.Notes.Application", "Fsso.Notes.Domain", "Fsso.Domain"]
    )) {
      failures.push(`${filePath} ${violation}`);
    }
  }

  const program = readFileSync(resolve(repoRoot, "src/Host/Program.fs"), "utf8");
  const programWithoutComments = stripFSharpComments(program);
  const programWithoutCommentsOrStrings = stripFSharpComments(program, { blankStrings: true });
  if (programWithoutComments.includes("/api/demos")) {
    failures.push("Host Program.fs contains a Demo route literal");
  }
  if (programWithoutComments.includes("/api/notes")) {
    failures.push("Host Program.fs contains a Notes route literal");
  }
  if (/CreateDemoHandler|IDemoStore|SqliteDemoStore/.test(programWithoutCommentsOrStrings)) {
    failures.push("Host Program.fs references Demo handler/store types");
  }
  if (/CreateNoteHandler|INoteStore|SqliteNoteStore|NoteResponse|NoteEndpoints/.test(programWithoutCommentsOrStrings)) {
    failures.push("Host Program.fs references Notes handler/store/DTO types");
  }

  checkMigrationVersions(repoRoot, failures);
  checkHostBoundaryFixture(repoRoot, failures);

  const sharedKernel = readFileSync(resolve(repoRoot, "src/Shared/Fsso.SharedKernel/UnitOfWork.fs"), "utf8");
  if (!/type\s+IUnitOfWork/.test(sharedKernel)) failures.push("shared IUnitOfWork must live in Fsso.SharedKernel");
  const composition = readFileSync(resolve(repoRoot, "src/Composition/Fsso.Composition/SqliteUnitOfWork.fs"), "utf8");
  if (!/type\s+SqliteUnitOfWork/.test(composition)) failures.push("shared SqliteUnitOfWork must live in Fsso.Composition");
  for (const file of walk(resolve(repoRoot, "src/Modules/Demo"))) {
    if (!file.endsWith(".fs")) continue;
    const text = readFileSync(file, "utf8");
    if (/type\s+IUnitOfWork/.test(text) || /type\s+SqliteUnitOfWork/.test(text)) {
      failures.push(`Demo module must not own shared unit-of-work types: ${posix(relative(repoRoot, file))}`);
    }
  }

  checkManifest(repoRoot, failures);

  if (failures.length) {
    const error = new Error(`architecture-check failed:\n${failures.map((item) => `- ${item}`).join("\n")}`);
    error.failures = failures;
    throw error;
  }

  return { projects: projectPaths.length, manifest: readFileSync(resolve(repoRoot, MANIFEST), "utf8").split("\n").filter(Boolean).length };
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    if (process.argv.includes("--write-manifest")) {
      const count = writeManifest(root);
      console.log(`architecture-check: wrote ${count} manifest entries to ${MANIFEST}`);
    }
    const result = checkRepository(root);
    const fixture = verifyForbiddenFixture(root);
    console.log(
      `architecture-check: OK (${result.projects} projects, ${result.manifest} Demo/test manifest files; forbidden fixture detected both violations at ${posix(relative(root, fixture))})`
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
