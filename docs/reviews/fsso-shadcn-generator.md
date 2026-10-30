# FSSO Stack — shadcn Component Generator Report

Status: DONE. Baseline `5d85517`; branch `feature/fsharp-fullstack`.
Scope: actual official shadcn-svelte component generation from the root single-package project, not build/help verification.

## Dependency and wrapper

- Added root-only devDependency exactly `shadcn-svelte` `1.7.1` with `npx --yes pnpm@10.30.3 add -D --save-exact shadcn-svelte@1.7.1` (RC 0).
- `pnpm-lock.yaml` now resolves `shadcn-svelte@1.7.1(svelte@5.43.2)`; frozen install RC 0. Existing `bits-ui` and other root dependency ranges were not changed.
- Added root script `shadcn:add` -> `node scripts/shadcn-add.mjs`.
- Wrapper stages a temporary `web/package.json` copied from the root manifest, runs the official CLI, then removes it in `finally` on both success and failure.
- Wrapper preflights `web/components.json`, the official binary, and the exact devDependency; rejects caller-supplied `--cwd`/`--no-deps-install`; snapshots root manifest/lock; and fails if either changed, if the temp manifest remains, or if a nested lock/install tree was newly created.
- Components with new dependencies are not silently installed at root: the wrapper uses `--no-deps-install`, and README/README_zh state that such dependencies must be added to the root manifest and lock explicitly.

## Actual generation

Wrapper command:

```bash
npx --yes pnpm@10.30.3 shadcn:add skeleton
```

Captured official CLI invocation (RC 0):

```bash
node_modules/.bin/shadcn-svelte add skeleton --cwd web --no-deps-install -y
```

CLI version: `shadcn-svelte 1.7.1`.

Generated files:

- `web/src/lib/components/ui/skeleton/skeleton.svelte`
- `web/src/lib/components/ui/skeleton/index.ts`

The generated Svelte file imports `$lib/utils.js`; it was left unedited. The existing Vite alias/TypeScript paths resolved it successfully for both `svelte-check` and the production build.

## Cleanup and single-package proof

- Success path: temp manifest removed; wrapper RC 0.
- Failure path: `npx --yes pnpm@10.30.3 shadcn:add definitely-not-a-real-component` returned RC 1 (`registry item does not exist`) and still removed the temp manifest.
- After both paths, `find web -maxdepth 1 -name package.json` is empty.
- No nested `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`; only root `pnpm-lock.yaml` exists.
- Root `package.json`/`pnpm-lock.yaml` were compared byte-for-byte by the wrapper across the successful generation and were unchanged by it (the only committed root changes are the intended dependency/script additions).
- `web/node_modules` may reappear as a gitignored Vite/Vitest cache after checks/builds; it is not an installed dependency tree and the wrapper only rejects a newly-created one.

## Post-review pre-existing manifest safety

Quality review found a Critical cleanup bug: `cleanup()` removed `web/package.json` whenever it existed, so the guard that rejects a pre-existing file still entered `catch`/`finally` and deleted the user's file.

Fix: added a module-level `staged` flag initialized to `false`. It is set to `true` only after the temporary manifest is successfully written; `cleanup()` returns immediately unless `staged`, and clears the flag after unlinking. The guard path therefore never unlinks, and the catch only warns about cleanup failure when a staged manifest remains.

Sentinel reproduction used an isolated copy under the approved scratch directory (no system `/tmp`):

| Case | RC | Result |
|---|---|---|
| Old wrapper from HEAD `508c3f0` against sentinel `{"sentinel":"PRESERVE_ME","mustRemain":true}` | 1 | guard message printed, sentinel file deleted (defect reproduced) |
| Fixed wrapper against restored sentinel | 1 | `web/package.json already exists; refusing to overwrite it`; file exists, `cmp` byte-identical, SHA256 `68193fb40d103298ad4862fe3ace8593ccca87081d9a855dd2827a74157211f9` |
| Fixed wrapper, fake CLI RC 0 (staged success) | 0 | temp manifest removed |
| Fixed wrapper, fake CLI RC 7 (staged failure) | 7 | temp manifest removed |
| Real `npx --yes pnpm@10.30.3 shadcn:add skeleton` after fix | 0 | no temp manifest; existing skeleton left unchanged |

## components.json schema change

The CLI updated `web/components.json` to its 1.7.1 schema (tab-indented JSON):

- Kept `$schema`, `style: "default"`, `tailwind.css`, `tailwind.baseColor`, `aliases`, and `typescript`.
- Removed the old `tailwind.config` and `tailwind.cssVariables` keys.
- Added `aliases.lib`, `registry: "https://tw3.shadcn-svelte.com/registry/default"` (Tailwind 3 registry), `iconLibrary: "lucide"`, `menuColor`, and `menuAccent`.

The config remains valid for the installed CLI and root Tailwind 3.4.17 setup.

## Verification

| Command | RC | Result |
|---|---|---|
| `npx --yes pnpm@10.30.3 install --frozen-lockfile` | 0 | root lock verified |
| `npx --yes pnpm@10.30.3 check` | 0 | brand/structure/MediatR/contract; dotnet build 0 warnings/0 errors; svelte-check 0/0 |
| `npx --yes pnpm@10.30.3 build` | 0 | frontend build + dotnet publish produced `artifacts/publish/Fsso.Host.dll` |
| `npx --yes pnpm@10.30.3 test` | 0 | originals 5/6/20 exact, CQRS 9, unit 5, Playwright 5 |
| `node scripts/brand-check.mjs` | 0 | 123 tracked paths/bytes (git mode) |
| `node scripts/structure-check.mjs` | 0 | no workspace, no `web/package.json`, root lock present |

## Concerns

- `--no-deps-install` intentionally does not update root dependencies. A future component with new dependencies requires a deliberate root `package.json` + `pnpm-lock.yaml` update and reinstall; otherwise the component will not build/run.
- The CLI's schema rewrite is accepted as generated tool output rather than hand-authored config.
- Skeleton is generated and checked but not yet imported into a page; this addendum only required component generation.
