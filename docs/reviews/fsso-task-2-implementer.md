# FSSO Stack — Task 2 Implementer Report

Status: DONE (Task 2 scope). Baseline: Task 1 approval `dbf397e`; this change's parent is docs HEAD `d045d9b`; branch `feature/fsharp-fullstack`.
Committed paths: source/tests/scripts/docs/root READMEs plus this report. No edits to `docs/fsso-stack-spec.md` or `docs/plans/2026-10-29-fsso-stack.md`.

## Delivered

- Replaced the custom `DemoHandlers` record with MediatR CQRS in `src/Application/Cqrs.fs`: `CreateDemoCommand`, `GetDemoQuery`, `ListDemosQuery`, `DeleteDemoCommand`.
- Each message implements `IRequest<Result<_, AppError>>`; separate concrete handlers implement `IRequestHandler<Message, Result<_, AppError>>` and inject `IUnitOfWork`/`IFaultInjector` by constructor.
- Preserved transaction/error behavior: create/delete writes run through one `IUnitOfWork.Run`; Ok commits, Error/exception roll back, cancellation rethrows; reads do not write. Domain validation maps through `AppError.validation`.
- Host uses `AddMediatR` assembly scanning. Data endpoints inject `ISender` and call `ISender.Send(typedMessage, ct)`; no handler record lookup or hand-written dispatch remains.
- Removed `src/Application/DemoHandlers.fs`; `Fsso.Application.fsproj` references MediatR `12.5.0` and compiles `Cqrs.fs`.
- Migrated `Application.Tests` and `Integration.Tests` to real DI/`ISender` while retaining all original test names and assertions. Added `tests/Cqrs.Tests` with 9 focused tests.
- Added `scripts/check-mediatr.mjs` and `scripts/contract-check.mjs`; wired both into `check` and `test`. Added `scripts/contract-hashes.json` (17 frozen contract files).
- Reworked `scripts/test.mjs` to run each original project with its own TRX, exact-compare test names to frozen `tests/original-test-names.json`, and count `Fsso.Cqrs.Tests` separately.
- Documented the MediatR version/license decision in `README.md` and added the short `README_zh.md`.
- Updated `FssoStack.slnx` and `structure-check.mjs` for the new CQRS test project.

## Dependency and license evidence

Exact pin: `MediatR` `12.5.0` in `src/Application/Fsso.Application.fsproj`; resolved library `MediatR/12.5.0`. `dotnet list src/Application/Fsso.Application.fsproj package --include-transitive` reports:

```text
> MediatR 12.5.0 12.5.0
> MediatR.Contracts 2.0.1 2.0.1
```

The installed nuspec (`~/.nuget/packages/mediatr/12.5.0/mediatr.nuspec`) declares `<version>12.5.0</version>` and `<license type="expression">Apache-2.0</license>`. `check-mediatr` also rejects any MediatR 13+ reference/resolution and scans `src` for `AddLicense`/`LicenseKey`/`LuckyPennySoftware`/`MediatR.License` markers. No paid key or registration code is present.

## Original test identity

`tests/original-test-names.json` was frozen from pre-change TRX output at the Task 2 baseline: `Fsso.Domain.Tests` 5, `Fsso.Application.Tests` 6, `Fsso.Integration.Tests` 20 (31 total). `scripts/test.mjs` now runs those three projects separately, writes one TRX per project, and asserts each sorted name set exactly equals the frozen set—not only the total. The separate CQRS project must pass exactly 9 tests; it is not counted as part of the original 31.

Final test evidence:

```text
Fsso.Domain.Tests: RC=0 passed=5 failed=0 total=5
Fsso.Application.Tests: RC=0 passed=6 failed=0 total=6
Fsso.Integration.Tests: RC=0 passed=20 failed=0 total=20
Fsso.Cqrs.Tests: RC=0 passed=9 failed=0 total=9
original test retention: RC=0 originals=Fsso.Domain.Tests=5,Fsso.Application.Tests=6,Fsso.Integration.Tests=20 total=31 cqrs=9
frontend unit: RC=0 passed=5
playwright: RC=0 passed=5
```

The 9 CQRS tests cover: exactly one handler per message and all four dispatches; missing registration fails without a fallback; 400/404/409 mapping; injected error rollback; injected exception rollback; pre-canceled send rollback/rethrow; delayed cancellation rollback; 8 concurrent unique creates; 8 concurrent same-id deletes yielding one success and seven 404s.

## Real commands and RCs

| Command | RC | Result |
|---|---|---|
| `npx --yes pnpm@10.30.3 install --frozen-lockfile` | 0 | lockfile up to date |
| `npx --yes pnpm@10.30.3 check` | 0 | brand, structure, MediatR, contract, `dotnet build -warnaserror` 0 warnings/0 errors, svelte-check 0/0 |
| `npx --yes pnpm@10.30.3 test` | 0 | all checks/build/negative control; originals 5/6/20 exact; CQRS 9; frontend unit 5; Playwright 5 |
| `npx --yes pnpm@10.30.3 gen:openapi` (pass 1 and 2) | 0/0 | live Host export, 5 operations |
| `npx --yes pnpm@10.30.3 gen:sdk` (pass 1 and 2) | 0/0 | generated SDK in `web/src/lib/api/generated` |
| `node scripts/contract-check.mjs` (after each pass) | 0/0 | all 17 frozen files unchanged |
| generation hash diff pass 1 vs pass 2 | 0 | identical OpenAPI/SDK hash sets |
| `npx --yes pnpm@10.30.3 build` | 0 | publish produced `artifacts/publish/Fsso.Host.dll` and `wwwroot` |
| `npx --yes pnpm@10.30.3 dev -- --smoke` | 0 | dev proxy `/api/demos` returned 200/0 items; bounded shutdown |
| `node scripts/brand-check.mjs` | 0 | 0 legacy matches over 122 tracked paths/bytes (git mode) |
| `node scripts/structure-check.mjs` | 0 | package/solution/assemblies/env/DB/OpenAPI/UI/no-workspace consumers |
| `node scripts/check-mediatr.mjs` | 0 | MediatR 12.5.0, Apache-2.0, no 13+/paid markers |
| `node scripts/contract-check.mjs` | 0 | OpenAPI/SDK contract hashes match frozen set |

## Post-review quality follow-up

- Corrected `README.md` architecture line for `src/Application` from “只引用 Domain” to “引用 Domain + MediatR”, matching `Fsso.Application.fsproj` and the detailed dependency rule below it. `README_zh.md` already stated Domain + MediatR.
- Fixed the shadcn wrapper cleanup defect where a pre-existing `web/package.json` could be deleted by the guard's `catch`/`finally`. Sentinel/byte-identical evidence is recorded in `docs/reviews/fsso-shadcn-generator.md`.

## Post-review clean-checkout fix

Review found one Important defect: `check-mediatr` ran before restore and hard-required `src/Application/obj/project.assets.json`, so `pnpm check`/`pnpm test` could fail on a clean checkout/archive.

Fix in `scripts/check-mediatr.mjs`: before reading assets/nuspec, detect either missing file and run the real `dotnet restore src/Application/Fsso.Application.fsproj` through the logged runner. A non-zero restore RC aborts immediately with that RC; no version/license assertion was weakened. After restore, the script still requires exactly `MediatR 12.5.0`, Apache-2.0, no 13+/paid markers, and rechecks that both assets and nuspec now exist. `NUGET_PACKAGES` is honored when resolving the nuspec.

Verification used a clean tracked archive (`git archive 45b8bd8 | tar -x -C <scratch>/fsso-clean-check-45b8bd8`) with no `.git`, `node_modules`, `bin`, `obj`, or `artifacts`, plus the fixed `scripts/check-mediatr.mjs` under test:

| Command | RC | Result |
|---|---|---|
| `npx --yes pnpm@10.30.3 install --frozen-lockfile` (clean copy) | 0 | root lock verified |
| `npx --yes pnpm@10.30.3 check` (clean copy) | 0 | output: `missing project.assets.json; restoring ...`; `== dotnet restore RC=0`; MediatR check, build, svelte-check all RC 0 |
| `npx --yes pnpm@10.30.3 check` (normal checkout) | 0 | MediatR check passes without restore; build/svelte-check RC 0 |
| `npx --yes pnpm@10.30.3 test` (normal checkout) | 0 | 31 originals exact, 9 CQRS, unit 5, Playwright 5 |
| `find web -maxdepth 1 -name package.json` | 0 | no output; no temp manifest |

## Generation evidence

The CQRS refactor did not alter the HTTP surface. Two clean generation passes produced identical hashes and the contract check passed after each:

| Output | SHA256 |
|---|---|
| `openapi/openapi.json` | `33df6b8214ad3db8cd7582647cbc0c68db02483664a0edf3b995c2feca9ee681` |
| `web/src/lib/api/generated/sdk.gen.ts` | `8c9945d74485f3067370a32ece1f5db7a9484de6045e42ce5ffc4283309ab9a0` |
| `src/Infrastructure/Generated/SqlHydra.fs` | `061eb397e980702ee3ac5d5ffae375e7eb5d09a413b1a0efca68e7f727db9085` |

`scripts/contract-hashes.json` freezes the OpenAPI file plus all 16 SDK files for `contract-check`; the manifest was derived from the Task 1 approved hashes (and verified against current output).

## Decisions and concerns

- MediatR `12.5.0` is intentionally old and no longer receives upstream updates or security support. This is documented in both READMEs; Task 2 does not use 13+, RPL/commercial terms, paid licenses, keys, or registration code.
- MediatR registration is assembly scanning rather than an explicit handler list. Handler selection is constrained by the single generic handler per message and is asserted by DI tests.
- `Fsso.Cqrs.Tests` references `Fsso.Host` to exercise both real `ISender` dispatch and HTTP endpoints; it uses a unique DB per test and disables parallelization.
- Test totals are deliberately split: 31 original identities are frozen, and 9 CQRS tests are separate. Adding CQRS tests cannot mask removal/renaming of an original test.
- No API/OpenAPI behavior change was intended or observed; the SDK/OpenAPI contract is hash-guarded. No real DB, credentials, or secrets were used.
- The host checkout directory still contains the legacy token and was not rewritten; brand checking covers the tracked tree and remains green.
