// 文件职责：逐个项目读取 MediatR 包引用、还原资产、dotnet list 结果与 nuspec，确认固定 12.5.0、Apache-2.0 许可且没有付费注册标记，避免版本漂移或商业授权代码混入。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { assert, root, runLogged } from "./lib.mjs";

const expected = "12.5.0";
const modulesRoot = resolve(root, "src/Modules");
const projects = readdirSync(modulesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `src/Modules/${entry.name}/Application/Fsso.Modules.${entry.name}.Application.fsproj`)
  .filter((project) => existsSync(resolve(root, project)));

assert(projects.length >= 1, "expected at least one module Application project with MediatR handlers");
for (const moduleName of ["Demo", "Notes"]) {
  const project = `src/Modules/${moduleName}/Application/Fsso.Modules.${moduleName}.Application.fsproj`;
  assert(projects.includes(project), `expected MediatR Application project ${project}`);
}

for (const project of projects) {
  const projectText = readFileSync(resolve(root, project), "utf8");
  const references = [...projectText.matchAll(/<PackageReference\s+Include="MediatR"\s+Version="([^"]+)"/g)].map((match) => match[1]);
  assert(references.length === 1, `expected exactly one MediatR PackageReference in ${project}, found ${references.length}`);
  assert(references[0] === expected, `MediatR PackageReference must be ${expected}, got ${references[0]}`);

  const assetsPath = resolve(root, dirname(project), "obj/project.assets.json");
  const packagesRoot = process.env.NUGET_PACKAGES ?? join(homedir(), ".nuget", "packages");
  const nuspecPath = join(packagesRoot, "mediatr", expected, "mediatr.nuspec");

  if (!existsSync(assetsPath) || !existsSync(nuspecPath)) {
    const missing = [
      !existsSync(assetsPath) ? "project.assets.json" : null,
      !existsSync(nuspecPath) ? "mediatr.nuspec" : null,
    ].filter(Boolean).join(", ");
    console.log(`check-mediatr: missing ${missing}; restoring ${project}`);
    const restored = runLogged("dotnet restore", "dotnet", ["restore", project]);
    assert(
      restored.status === 0,
      `dotnet restore ${project} failed RC=${restored.status}; refusing to continue without restore`
    );
  }

  assert(existsSync(assetsPath), `Application project.assets.json still missing after restore: ${assetsPath}`);
  const assets = JSON.parse(readFileSync(assetsPath, "utf8"));
  const mediatRLibraries = Object.keys(assets.libraries ?? {}).filter((key) => key.startsWith("MediatR/"));
  assert(mediatRLibraries.length === 1, `expected exactly one resolved MediatR library in ${project}, got ${mediatRLibraries.join(", ") || "none"}`);
  assert(mediatRLibraries[0] === `MediatR/${expected}`, `resolved MediatR must be ${expected}, got ${mediatRLibraries[0]}`);

  const listed = execFileSync("dotnet", ["list", project, "package", "--include-transitive"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const direct = listed.match(/^\s*>\s+MediatR\s+(\S+)\s+(\S+)\s*$/m);
  assert(direct, `dotnet list did not report a direct MediatR package for ${project}`);
  assert(direct[1] === expected && direct[2] === expected, `dotnet list MediatR requested/resolved must be ${expected}/${expected}, got ${direct[1]}/${direct[2]}`);

  assert(existsSync(nuspecPath), `MediatR nuspec still missing after restore: ${nuspecPath}`);
  const nuspec = readFileSync(nuspecPath, "utf8");
  assert(new RegExp(`<version>${expected.replaceAll(".", "\\.")}</version>`).test(nuspec), `nuspec version must be ${expected}`);
  assert(/<license type="expression">Apache-2\.0<\/license>/.test(nuspec), "MediatR nuspec license must be Apache-2.0 expression");

  const versions = [references[0], mediatRLibraries[0].split("/")[1], direct[1], direct[2]];
  for (const version of versions) {
    const major = Number(version.split(".")[0]);
    assert(Number.isInteger(major) && major < 13, `MediatR 13+ is forbidden, got ${version}`);
    assert(version === expected, `MediatR version must be ${expected}, got ${version}`);
  }
}

const paidMarkers = [/AddLicense/i, /LicenseKey/i, /LuckyPennySoftware/i, /MediatR\.License/i];
const sourceRoots = [resolve(root, "src")];
const forbidden = [];
for (const sourceRoot of sourceRoots) {
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.(fs|fsproj)$/.test(entry.name)) continue;
    const file = join(entry.parentPath ?? entry.path, entry.name);
    const text = readFileSync(file, "utf8");
    for (const marker of paidMarkers) {
      if (marker.test(text)) forbidden.push(`${file}: ${marker}`);
    }
  }
}
assert(forbidden.length === 0, `paid MediatR license registration/key markers found:\n${forbidden.join("\n")}`);

console.log(`check-mediatr: OK (${projects.length} Application project(s), MediatR ${expected}, Apache-2.0, no 13+/paid license markers)`);
