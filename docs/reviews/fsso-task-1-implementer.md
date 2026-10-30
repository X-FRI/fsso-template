# FSSO Stack — Task 1 Implementer Report

Status: DONE (Task 1 scope). Commit: this commit (source, tests, scripts, generated outputs, docs, and this report).
Baseline: `96e0007`; docs base `454ac09`; branch `feature/fsharp-fullstack`.

## Delivered

- Moved `apps/frontend` to top-level `web`; deleted `apps/`, `pnpm-workspace.yaml`, and the nested `web/package.json`.
- Root package `fsso-stack` now owns all Svelte/Vite/Tailwind/bits-ui/clsx/tailwind-merge/tailwind-variants/@hey-api client-fetch/Playwright/Vitest/svelte-check/TypeScript dependencies and one root lockfile.
- Renamed solution to `FssoStack.slnx`; project files and assemblies are `Fsso.Domain`, `Fsso.Application`, `Fsso.Infrastructure`, `Fsso.Host`, `Fsso.Domain.Tests`, `Fsso.Application.Tests`, `Fsso.Integration.Tests`; namespaces are `Fsso.*`; Host output is `Fsso.Host.dll`.
- Renamed environment variables to `FSSO_*`; default DB is `data/fsso.db`; archive name is `artifacts/fsso-stack-source.tar.gz`.
- Updated display/product/OpenAPI/UI/package strings to FSSO Stack / fsso-stack. Host OpenAPI title is `FSSO Stack API`; UI title/heading are `FSSO Stack`.
- Root dev/build/check/test/gen/release/package scripts run web tooling from the root with explicit web config paths, no workspace or directory flag.
- Added `scripts/brand-check.mjs` (base64-encoded pattern, case-insensitive, binary-safe, scans `git ls-files` paths and bytes) and `scripts/structure-check.mjs` (package/solution/assemblies/env/DB/OpenAPI/UI/no-workspace consumers); both are separate stages in `check` and `test`.
- Redacted historical docs to neutral pre-FSSO wording, marked them `HISTORICAL (pre-FSSO)`, renamed the historical plan path, and replaced absolute checkout paths with `<repo>`/`<scratch>` placeholders.
- Did not add README_zh, the Task 2 fail-closed DB guard, or any CI workflow.

## Real commands and RCs

| Command | RC | Result |
|---|---|---|
| `npx --yes pnpm@10.30.3 install` | 0 | lockfile regenerated; 169 packages linked |
| `npx --yes pnpm@10.30.3 install --frozen-lockfile` | 0 | lockfile up to date; frozen verify passed |
| `npx --yes pnpm@10.30.3 check` | 0 | brand 0, structure 0, dotnet build 0 warnings/0 errors, svelte-check 0 errors/0 warnings |
| `npx --yes pnpm@10.30.3 test` | 0 | brand/structure 0; build/publish 0; negative control 0; dotnet 31 passed (5/6/20); frontend unit 5 passed; Playwright 5 passed |
| `npx --yes pnpm@10.30.3 build` | 0 | web build + publish produced `artifacts/publish/Fsso.Host.dll` and `wwwroot/index.html` |
| `npx --yes pnpm@10.30.3 dev -- --smoke` | 0 | Host 5080 + Vite 5173; proxy `/api/demos` 200; bounded shutdown |
| `node scripts/brand-check.mjs` | 0 | 0 legacy matches over 114 tracked paths/bytes (git mode) |
| `node scripts/brand-check.mjs` in copied no-git tree | 0 | git listing RC 128; filesystem fallback scanned 114 paths/bytes, 0 matches |
| negative fallback check (injected encoded token in scratch copy) | 1 | fallback detected the injected byte in `injected-legacy.txt`; file removed after the check |
| `npx --yes pnpm@10.30.3 check` (after fallback fix) | 0 | brand/structure/build/svelte-check all pass |
| `node scripts/structure-check.mjs` | 0 | package, solution, assemblies, env, DB, OpenAPI, UI, no workspace consumers |
| `bash scripts/gen-sqlhydra.sh` | 1 then 0 | first run failed on a stale `Infrastructure.fsproj` path inside the script; corrected script then RC 0 |
| `npx --yes pnpm@10.30.3 gen:openapi` | 0 | live Host export, 5 operations |
| `npx --yes pnpm@10.30.3 gen:sdk` | 0 | generated SDK into `web/src/lib/api/generated`; required operations/types verified |
| second generation pass (SqlHydra/OpenAPI/SDK) | 0/0/0 | source hash file diff RC 0 |

Playwright used the project Chromium via `PLAYWRIGHT_BROWSERS_PATH`; the passing journey ran against the published single process with `BASE_URL`.

## Generation evidence

Key SHA256 values after generation pass 1; pass 2 produced an identical hash set (`diff` RC 0):

| Output | SHA256 |
|---|---|
| `src/Infrastructure/Generated/SqlHydra.fs` | `061eb397e980702ee3ac5d5ffae375e7eb5d09a413b1a0efca68e7f727db9085` |
| `openapi/openapi.json` | `33df6b8214ad3db8cd7582647cbc0c68db02483664a0edf3b995c2feca9ee681` |
| `web/src/lib/api/generated/sdk.gen.ts` | `8c9945d74485f3067370a32ece1f5db7a9484de6045e42ce5ffc4283309ab9a0` |

Full pass-1/pass-2 hash lists are in the approved scratch evidence (`fsso-gen-hashes-1.txt`, `fsso-gen-hashes-2.txt`). Generated outputs were produced by the corrected generators, not hand-edited.

## Brand census

`scripts/brand-check.mjs` decodes the legacy pattern from base64 at runtime and scans paths plus file bytes case-insensitively and binary-safely. When `git ls-files` is available it scans exactly the tracked set (normal repository: RC 0, 114 paths). When Git is unavailable (source archive without `.git`), it recursively lists the delivered source tree, excluding only generated/dependency/cache directories (`.git`, `.tools`, `node_modules`, `bin`, `obj`, `artifacts`, `data`, `web/dist`, `src/Host/wwwroot`, caches), with no path allowlist. A copied no-git tree ran RC 0 over 114 filesystem paths; injecting an encoded legacy token into that copy produced RC 1, proving the fallback does not suppress suspicious files. `git grep`-equivalent active-consumer checks show no old app path, workspace file, workspace package, or legacy env/assembly references. The pre-fix census was 113 paths; the post-report census is 114.

## Decisions and concerns

- Because `web` intentionally has no `package.json`, pnpm `exec` cannot run from inside `web`. Root scripts invoke Vite/svelte-check/Vitest/Playwright with explicit `--config`/`--root` paths from the root package. Vite root, Tailwind content, and PostCSS Tailwind config paths are absolute or config-relative so they resolve from any working directory.
- `pnpm install` warns that `esbuild` lifecycle scripts are ignored by default; the existing binary works and real Vite builds pass. No build-script approval was changed.
- SqlHydra still reports `Table Declarations: False`; the checked-in one-line `Tables.fs` complements generated types/factory as in the historical implementation.
- Synthetic DBs only were used (`artifacts/`); no real user DB was opened. Task 2 migration/backup behavior remains intentionally unimplemented.
- Package-source was updated for `web`/`FssoStack.slnx`/`Fsso.Host.dll` and forbidden `apps`/workspace paths, but was not executed in this Task 1 timebox; Task 3 owns archive execution.
- Historical evidence retains recorded results but uses neutral brand wording and placeholders; Git history and the host checkout directory were not rewritten.
