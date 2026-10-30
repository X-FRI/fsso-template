# FSSO Modular Refactor — Task 3 Final Report

Status: IN REVIEW — PENDING REVIEWS. The v4 archive and fresh extraction passed the targeted quality-fix acceptance gates. The Task 3 spec PASS is bound only to `ab650ff5a8c7d94a763f8f563532b6b55d19181a`/v3. The v4 candidate's spec is not reviewed; Task 3 quality and final independent integration remain pending. This report does not claim a final Task 3 verdict.

- Repository: `<repo>` (local branch `feature/fsharp-fullstack`; no push, deploy, or global configuration).
- Prior source validation commit A1: `df0830dfe94dae48387855b5924af7b749dbe221`.
- Prior v2 archived source A2: `4e8f2a65af0ac30de7ff6cc406dee20c89ab967f`.
- Prior v2 report-only follow-up B: `95a89b3674420f6f688671b8258411f039977a97`.
- Prior v3 source (pre-archive commit): `ab650ff5a8c7d94a763f8f563532b6b55d19181a`.
- Prior v3 report-only follow-up: `01b0603bce23bffe05090442e6ee56727d51af36`.
- v4 source (pre-archive commit): `a155486d0d35e5f2fd870c3b7fdb1af97bd27466`.
- v4 report-only follow-up: the commit containing this update; a commit cannot contain its own final SHA.
- v4 archive: `<repo>/artifacts/fsso-modular-source-v4.tar.gz`, SHA256 `3a1adff96c3fe7c1ed9090030b8e637daaed6d406ddbde6dfb87142bbde23f2c`, 224,091 bytes / 244 entries.
- v4 fresh extraction: `<repo>/artifacts/independence/independent-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765`.
- v4 package evidence: `<repo>/artifacts/final/package-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765/`.
- v4 manual evidence: `<repo>/artifacts/final/v4-manual-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-1793269853-4887/`.
- Preserved v3 archive: `<repo>/artifacts/fsso-modular-source-v3.tar.gz`, SHA256 `32ea83fd8eef541db83ea5a7e7d3f1a51c41436735d43e1a93d8561017883e0b`, 221,116 bytes / 244 entries.
- Preserved v3 fresh extraction: `<repo>/artifacts/independence/independent-ab650ff5a8c7d94a763f8f563532b6b55d19181a-2026-10-29T10-01-31-904Z-95125`.
- Preserved v3 package evidence: `<repo>/artifacts/final/package-ab650ff5a8c7d94a763f8f563532b6b55d19181a-2026-10-29T10-01-31-904Z-95125/`.
- Preserved v3 manual evidence: `<repo>/artifacts/final/v3-manual-ab650ff5a8c7d94a763f8f563532b6b55d19181a-1793268354-96955/`.
- Preserved v2 archive: `<repo>/artifacts/fsso-modular-source-v2.tar.gz`, SHA256 `1a594ac3373120c5d89d209c9678c150ed4e7f4ad8b96f0a5e1249695a5cfbb6`, 244 entries. It is preserved and not overwritten.
- Preserved v2 fresh extraction: `<repo>/artifacts/independence/independent-4e8f2a65af0ac30de7ff6cc406dee20c89ab967f-2026-10-29T09-49-12-389Z-90163`.
- Preserved v2 package evidence: `<repo>/artifacts/final/package-4e8f2a65af0ac30de7ff6cc406dee20c89ab967f-2026-10-29T09-49-12-389Z-90163/`.
- Preserved v2 manual evidence: `<repo>/artifacts/final/v2-manual-4e8f2a65af0ac30de7ff6cc406dee20c89ab967f-1793267581-91445/`.
- Preserved historical v1 archive: `<repo>/artifacts/fsso-modular-source.tar.gz`, SHA256 `8a8db31ea1c7e7094963707404360d5d4923855473033164ef32cc885e72b1b0`. It was not overwritten or deleted.
- Redaction: `<repo>` replaces only the local checkout path to satisfy the zero-legacy-brand scan. Approved independent scratch log paths outside the checkout are cited verbatim as supplemental evidence and are not brand-scanned artifacts.

## 1. Defect-fix scope

This round fixes the independent Task 3 spec review verdict `REQUEST_CHANGES` without redoing Task 1/2 features:

1. Removed the archived report placeholders. The v2 archive contains an IN REVIEW pre-archive candidate report with actual pre-archive commands, RCs, hashes, source validation SHA A1, and explicit wording that archive-bound evidence is recorded in report-only follow-up B. The v1 archive remains preserved as historical evidence.
2. Replaced premature final status with IN REVIEW/PENDING REVIEWS in the report and ledger. The ledger Phase 6 section does not declare Task 3 finished while reviews remain pending.
3. Fixed `scripts/brand-check.mjs` so a nested extraction cannot silently scan zero paths through a parent Git repository. It now requires `git rev-parse --show-toplevel` to equal the analyzed root; otherwise it walks the filesystem and fails if zero paths are scanned.
4. Added strict report gates: unresolved `__[A-Z0-9_]+__` placeholders and premature `Status: COMPLETE`/ledger Phase 6 completion are rejected by structure/package checks before archive creation and again in fresh extraction.
5. Added an explicit versioned archive path (`FSSO_ARCHIVE_PATH`) with default `artifacts/fsso-modular-source-v2.tar.gz`. The v1 archive is never overwritten, and extraction remains a new unique directory.
6. Recorded that full `pnpm test` was not run in the main repository. Full test evidence comes from the fresh extraction plus independent parent runs; no main-repository full-test success is claimed.
7. Ran the new candidate acceptance, including dev `--smoke`, release smoke, Notes create/get/restart, backup/restore, one-process static/API, clean nested brand-check with nonzero files, brand negative fixture, and zero-brand archive/extraction census.
8. Committed corrected source before creating the new versioned archive; this report-only follow-up records the source SHA, archive path/SHA256, extraction, RCs, and still-pending review status.
9. Updated this report, the review log, and the ledger truthfully. No Task 3 reviewer verdict is invented.
10. v3 narrow correction: removed the stale v1 parent-directory references; cited the valid v2 parent logs only as supplemental evidence with an explicit no-separate-process-exit caveat; and made the v2 package summary `exit=0` plus manual `rc.txt` the primary true-cwd/RC evidence. Standalone Playwright (5 journeys), dev smoke, and release smoke are recorded as RC0 and bound to `4e8f2a6`.
11. v4 targeted quality correction (reviewer `ses_e78db35ddffeMJOA4p5ec3WJ3V`, REQUEST_CHANGES): corrected both module-copy guides to add only Application+Infrastructure references to `Fsso.Composition.fsproj`, register stores in `SqliteUnitOfWork.fs` (`StoreKeys`/`StoreFactory`/`stores`; `SqliteWorkScope` remains generic), and add the new Api `ProjectReference` to Host before the descriptor. Package acceptance text now distinguishes independent-host Demo create/list/get (get after restart; no delete/update) from full-test/release-smoke delete coverage. The review log now binds v2/v3/v4 correctly and records the Task 3 spec PASS only for `ab650ff`/v3. The scratch-redaction statement now distinguishes checkout redaction from verbatim approved scratch logs. Minor 4 (required-file list) remains explicitly nonblocking; no code/test framework is expanded.

No Notes list/delete/tags/UI or browser/unit case was added. Demo HTTP/SQLite behavior, the Demo OpenAPI/SDK subset, Demo migration bytes, and Task 2 feature behavior remain unchanged.

## 2. Pre-archive verification in the main repository

Environment block from the plan was exported. Full `pnpm test` was intentionally **not** run in the main repository, to preserve generated evidence. Non-destructive main-repository checks at source A1:

| Gate | Command | RC | Log |
| --- | --- | ---: | --- |
| Root check | `pnpm check` | 0 | `artifacts/final/v2-pre-task3-defect-fix/pnpm-check.log` |
| Contract hashes | `node scripts/contract-check.mjs` | 0 | `artifacts/final/v2-pre-task3-defect-fix/contract-check.log` |
| Architecture | `node scripts/architecture-check.mjs` | 0 | `artifacts/final/v2-pre-task3-defect-fix/architecture-check.log` |
| Demo contract | `node scripts/demo-contract-check.mjs` | 0 | `artifacts/final/v2-pre-task3-defect-fix/demo-contract-check.log` |
| Structure + report gates | `node scripts/structure-check.mjs` | 0 | `artifacts/final/v2-pre-task3-defect-fix/structure-check.log` |
| Brand | `node scripts/brand-check.mjs` | 0 | `artifacts/final/v2-pre-task3-defect-fix/brand-check.log` |

`pnpm check` includes brand, structure plus report gates, MediatR/license, contract, architecture, Demo contract, `dotnet build FssoStack.slnx -warnaserror`, and `svelte-check`. It reported 0 warnings/0 errors and svelte-check 0 errors/0 warnings.

## 3. Supplemental independent v2 parent-run evidence

The valid v2 parent runs are in `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/` and are bound to v2 source `4e8f2a6`. They are **supplemental only** and lack a separate process-exit line. Primary true-cwd/RC evidence is the preserved v2 package summary `<repo>/artifacts/final/package-4e8f2a65af0ac30de7ff6cc406dee20c89ab967f-2026-10-29T09-49-12-389Z-90163/package-source-summary.log` (`exit=0`) plus the preserved manual `artifacts/final/v2-manual-4e8f2a65af0ac30de7ff6cc406dee20c89ab967f-1793267581-91445/rc.txt`. The v3 package summary `<repo>/artifacts/final/package-ab650ff5a8c7d94a763f8f563532b6b55d19181a-2026-10-29T10-01-31-904Z-95125/package-source-summary.log` records `exit=0`, and the v3 manual `artifacts/final/v3-manual-ab650ff5a8c7d94a763f8f563532b6b55d19181a-1793268354-96955/rc.txt` records all expected RCs. These package summaries plus manual RC files are the primary true-cwd/RC evidence. The v4 package summary `<repo>/artifacts/final/package-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765/package-source-summary.log` records `exit=0`, and the v4 manual `artifacts/final/v4-manual-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-1793269853-4887/rc.txt` records all expected RCs. These package summaries plus manual RC files are the primary true-cwd/RC evidence.

| Supplemental run | Log | Observed result |
| --- | --- | --- |
| Frozen install | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-install.log` | pnpm install finished (`Done in 1.6s`) |
| `pnpm check` | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-check.log` | dotnet build RC 0 (0 warnings/0 errors), svelte-check 0 errors/0 warnings |
| `pnpm test` | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-test.log` | internal stages RC 0; 5/6/20/13/8; backup/restore RC 0; frontend 5; Notes HTTP; Playwright 5 |
| Standalone Playwright | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-playwright.log` | RC 0; 5 journeys passed |
| `dev --smoke` | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-dev.log` | RC 0; `Dev proxy OK`; `Dev smoke complete` |
| Release smoke | `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/parent-release.log` | RC 0; `Release smoke OK: static, assets, API CRUD, JSON 404, pagination 400, restart persistence` (create/list/get/restart/delete; no update endpoint) |

These parent logs do not contain a separate process-exit line and are not used as the primary RC proof. No unapproved main-repository full-test success is claimed.

## 4. Tests and exact identities

| Suite | Count | Identity source |
| --- | ---: | --- |
| Original backend | 31 | Domain 5, Application 6, Integration 20; exact frozen names |
| CQRS/startup | 13 | Dedicated suite; no skips |
| Notes backend | 8 | Separate suite; exact eight required names |
| Frontend unit | 5 | Original five identities |
| Playwright Demo journeys | 5 | Original five browser journeys |
| Backup/restore | 1 synthetic check | Real HTTP create -> stop -> `.backup` -> `.restore` -> restored readback |

Notes test names:

```text
Fsso.Notes.Tests.NotesTests.CreateAndGetNoteHttpRoundTripPersistsInSqlite
Fsso.Notes.Tests.NotesTests.ValidationAndMissingIdReturnUniformErrors
Fsso.Notes.Tests.NotesTests.MigrationAddsNotesTableAndKeepsDemoMigrationVersions
Fsso.Notes.Tests.NotesTests.RestartPersistenceReadsNoteCreatedBeforeRestart
Fsso.Notes.Tests.TransactionTests.CrossModuleCommitWritesDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleErrorRollsBackDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleExceptionRollsBackDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleCancellationRollsBackDemoAndNote
```

## 5. Generated artifacts and frozen hashes

Generation remains generator-only; no generated file is hand-edited.

| Artifact | SHA256 |
| --- | --- |
| `openapi/openapi.json` | `cc04c144dc35593196c39f28a9b93a192a67cc2d963f471722c247071322ea0e` |
| `web/src/lib/api/generated/sdk.gen.ts` | `24dc19792fe1ce0a4b8fde246456b26ed163a74df8831663dfaee45f04b22052` |
| `web/src/lib/api/generated/types.gen.ts` | `145a9378536c04ff463121a098c4cc732c4445041c164822e9ad6f225734bf2f` |
| `src/Shared/Fsso.Database/Generated/SqlHydra.fs` | `e197516861edc36f360cce79c9a60d0560b790d0556c7760c106cb795df7cac8` |
| `scripts/contract-hashes.json` | `c91d136142f17b88d52ac8e781f11a77522dea144e5b152a06c38d83c9b463ff` |
| Notes migration `003_create_notes.sql` | `478bcb80e01009417f2dafbf35a96c81e2ac73c4e2b7b02a07e71ace281032da` |
| Demo migration `001_create_demos.sql` | `4de5c1ac5f97d3a389a2c929cf9a5b0bd258ae87feaf8c52859338e3237edad2` |
| Demo migration `002_index_demos_created.sql` | `353982e483ddd464792bb6c502de8b8a3838f5183950b572f7e98e1de03b405c` |

`node scripts/contract-check.mjs` freezes 17 files. `node scripts/demo-contract-check.mjs` reports Demo OpenAPI 2 paths, 4 schemas; SDK 4 operations, 24 types. Expected operation IDs remain exactly `createDemo`, `listDemos`, `getDemo`, `deleteDemo`, `health`, `createNote`, `getNote`.

## 6. Report/status gates

- `scripts/lib.mjs` rejects literal `__[A-Z0-9_]+__` placeholders in `README.md`, `README_zh.md`, and `docs/**/*.md`.
- While the modular review log/report is pending, the modular final report must not have `Status: COMPLETE`, and the ledger `## Phase 6 — FSSO modular Task 3` section must not declare completion.
- `scripts/structure-check.mjs` runs these gates. `scripts/package-source.mjs` runs them before archive creation and again on the fresh extraction.
- v2 package summary records `report status gates: RC=0` and `extracted report status gates: RC=0`.

## 7. v4 archive and fresh-extraction acceptance

The v4 archive was created from pre-archive source `a155486d0d35e5f2fd870c3b7fdb1af97bd27466` by `FSSO_ARCHIVE_PATH=artifacts/fsso-modular-source-v4.tar.gz node scripts/package-source.mjs`. The v1, v2, and v3 archives were not overwritten.

| Gate | RC | Evidence |
| --- | ---: | --- |
| Package/archive command | 0 | `artifacts/final/v4-package-rc.txt`; `artifacts/final/v4-package-console-1793269603-3762.log` |
| Report status gates before archive | 0 | v4 package evidence `package-source-summary.log` |
| `git archive` | 0 | v4 archive SHA256 `3a1adff96c3fe7c1ed9090030b8e637daaed6d406ddbde6dfb87142bbde23f2c` |
| Archive required/forbidden assertions | 0 | 244 entries; required present; forbidden absent; legacy paths 0 |
| Fresh extraction | 0 | `<repo>/artifacts/independence/independent-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765` |
| Extracted report status gates | 0 | v4 package evidence `package-source-summary.log` |
| Extracted zero-brand census | 0 | 186 files; legacy paths 0; legacy byte occurrences 0 |
| Frozen install | 0 | v4 package evidence `independent-install.log` |
| Independent `pnpm check` | 0 | v4 package evidence `independent-check.log` |
| Independent `pnpm build` | 0 | v4 package evidence `independent-build.log` |
| Independent `pnpm test` | 0 | v4 package evidence `independent-test.log`; extraction `artifacts/test-summary.log` |
| Demo browser 5 | 0 | extraction `artifacts/test-summary.log` (`playwright: RC=0 passed=5`) |
| Backup/restore | 0 | extraction `artifacts/test-summary.log` (`backup/restore: RC=0`); manual `backup-restore.log` RC 0 |
| One-process static/API | 0 | v4 package evidence `independent-host.log`; no descendant processes |
| Independent host Demo create/list/get + Notes create/get | 0 | v4 package evidence `independent-host.log`; Demo get after restart; no delete/update; Notes create 201/get 200. Release-smoke and full tests exercise Demo delete. |
| Demo/Notes restart persistence | 0 | v4 package evidence `independent-host-restart.log` |
| Manual clean nested brand-check | 0 | 186 filesystem paths; manual `brand-clean.log` |
| Manual brand negative fixture | 1 expected | 187 paths scanned; token path named; manual `brand-negative.log` |
| Manual `dev --smoke` | 0 | `Dev proxy OK`; `Dev smoke complete`; manual `dev-smoke.log` |
| Manual standalone Playwright | 0 | 5 journeys passed; manual `playwright.log` |
| Manual release smoke | 0 | `Release smoke OK`; create/list/get/restart/delete; manual `release-smoke.log` |

Fresh-extraction `artifacts/test-summary.log` exact identities:

```text
brand check: RC=0
structure check: RC=0
MediatR check: RC=0
contract check: RC=0
architecture check: RC=0
demo contract check: RC=0
build/publish: RC=0
negative control: RC=0
Fsso.Domain.Tests: RC=0 passed=5 failed=0 total=5
Fsso.Application.Tests: RC=0 passed=6 failed=0 total=6
Fsso.Integration.Tests: RC=0 passed=20 failed=0 total=20
Fsso.Cqrs.Tests: RC=0 passed=13 failed=0 total=13
Fsso.Notes.Tests: RC=0 passed=8 failed=0 total=8
backup/restore: RC=0
frontend check: RC=0
frontend unit: RC=0 passed=5
published Notes API: RC=0 create=201 get=200
playwright: RC=0 passed=5
exit=0
```

The independent published process returned static SPA/assets, Demo create/list/pagination/400/404/JSON-404, Demo get after restart, Notes `POST /api/notes` 201 with `Location`, Notes `GET /api/notes/{id}` 200, and restart persistence for both rows. The independent host does not exercise Demo delete or update; Demo delete is covered by release-smoke and the full test suite. `assertSingleDotnetTree` found no child process, so production has no Node child.

## 8. Nested brand-check proof

- Clean v4 extraction: `node scripts/brand-check.mjs` detected the parent Git checkout, used the filesystem fallback, scanned 186 paths, and returned RC 0. Logs: v4 manual `brand-clean.log`; extraction `artifacts/test-brand-check.log` also records 186 filesystem paths.
- v4 negative fixture: `<repo>/artifacts/final/v4-brand-negative-a155486-1793269853-4887` (preserved). A scratch-only `brand-negative-control.txt` was injected; brand-check scanned 187 paths, named `brand-negative-control.txt`, and returned RC 1 as required. Log: v4 manual `brand-negative.log`.
- Preserved v3 negative fixture remains at `artifacts/final/v3-brand-negative-ab650ff-1793268355-96955`; no prior negative fixture or archive was deleted.

## 9. Review record

| Scope | Reviewer session | Verdict |
| --- | --- | --- |
| Task 1 spec-compliance | `ses_e795c6e86ffexkrnxuYOO0Humd` | PASS |
| Task 1 code-quality (initial) | `ses_e79586203ffeoPwcNxuqyHtY7a` | REQUEST_CHANGES |
| Task 1 code-quality (re-review) | `ses_e79471f54ffedQcmhnM5Ffh1GZ` | PASS |
| Task 2 spec-compliance | `ses_e792e7609ffeeIe0r4tfZNjMWy` | PASS |
| Task 2 code-quality (initial) | `ses_e7926a232ffeH4u8cIDIHKKUe7` | REQUEST_CHANGES |
| Task 2 code-quality (targeted re-review) | `ses_e7926a232ffeH4u8cIDIHKKUe7` | PASS |
| Task 3 spec-compliance (initial, v1) | not recorded in handoff | REQUEST_CHANGES |
| Task 3 spec-compliance (v3 only) | `ses_e78f83139ffeBdW16j9mtVBw9c` | PASS for `ab650ff`/v3 only |
| Task 3 spec-compliance (v4 candidate) | NOT REVIEWED | PENDING |
| Task 3 code-quality (v3, pre-fix) | `ses_e78db35ddffeMJOA4p5ec3WJ3V` | REQUEST_CHANGES |
| Task 3 code-quality (v4 candidate) | PENDING | PENDING |
| Final independent integration (v4) | PENDING | PENDING |

The v3 spec PASS is not transferred to the v4 candidate. Historical pre-modular reviewer session IDs and verdicts are enumerated in `docs/reviews/fsso-modular-review-log.md`; they are not Task 3 verdicts. No Task 3 verdict is invented.

## 10. Gaps, deviations, and honest limitations

- **Review status:** Task 3 remains IN REVIEW. The v4 archive and extraction passed acceptance. The only Task 3 spec PASS is bound to `ab650ff`/v3; the v4 spec is not reviewed, and v4 quality plus final integration remain pending.
- **Main-repository test avoidance:** full `pnpm test` was not run in the main repository, to preserve generated evidence. Full test evidence is the fresh extraction plus the independent parent logs in section 3.
- **Report ordering:** the v4 archive contains the pre-archive report. This report-only follow-up records v4 source SHA, archive path/SHA256, extraction, and RCs. Prior v1/v2/v3 archives are preserved; the v3 spec PASS remains bound to `ab650ff`/v3.
- **Parent evidence quality:** valid v2 parent logs are supplemental and lack a separate process-exit line. Primary true-cwd/RC evidence is the v2/v3/v4 package summary `exit=0` plus manual `rc.txt`. The earlier stale v1 parent-path citations were removed in the v3 pre-archive source; the preserved v2 archive is not rewritten.
- **Scratch redaction:** `<repo>` redacts only the local checkout path for the brand scan. Approved independent scratch log paths outside the checkout are cited verbatim as supplemental evidence.
- **Nonblocking reviewer minor 4:** the required-file-list observation is explicitly nonblocking; this round does not expand code or the test framework.
- **Prior generated-artifact overwrite deviation (preserved):** Task 2 overwrote disposable `artifacts/test-trx/` and recreated `artifacts/architecture-forbidden-fixture/`; no source, user data, or application database was affected. This round preserves prior archives, extractions, and fixture directories.
- **Historical `/tmp` reviewer deviation:** preserved under `artifacts/process-deviations/`; this round uses project `artifacts/` and `TMPDIR=artifacts/tmp`, never system `/tmp`.
- **MediatR 12.5.0:** older Apache-2.0 line without upstream security support; no 13+/paid registration.
- **Notes is backend-only:** no list/delete/tags/UI/browser journey.
- **Starter limitations:** no authentication/authorization/audit/tenant isolation/rate limiting; SQLite is single-process; no WAL/horizontal scaling; no CI.
- **No push/deploy/real database:** all verification uses synthetic paths under `artifacts/` or the fresh extraction.

## 11. File inventory for this defect-fix round

Modified: `README.md`, `README_zh.md`, `scripts/brand-check.mjs`, `scripts/lib.mjs`, `scripts/structure-check.mjs`, `scripts/package-source.mjs`, `docs/ledger.md`, `docs/reviews/fsso-modular-final-report.md`, `docs/reviews/fsso-modular-review-log.md`.

No product source, test source, generated OpenAPI/SDK/SqlHydra file, migration, or Demo/test manifest file is changed by this v4 correction. Documentation-only changes cover the two README guides, this report, the review log, and the ledger. The report-only follow-up changes only documentation.
