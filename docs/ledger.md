# Coordinator Ledger — pre-FSSO starter

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Branch: `feature/fsharp-fullstack` (local only; no remote/push/merge).
Reference: parent archive SHA `363c45245b098507928a3524978c09d3dcb49db7`; reference tree `<historical-reference>`.
Toolchain: .NET SDK 10.0.403/runtime 10.0.14 at PROJECT/.tools/dotnet; Node 26.7.0; OpenCode 1.19.5 verified. pnpm via npx 10.30.3. No reassessment/install.

## Phase 0 — documents

| Time | Role | Session/task | BASE -> HEAD | Commands | Outcome |
|---|---|---|---|---|---|
| 2026-10-28 | Coordinator | top-level | none -> 20b7413 | git init; docs/design.md | design committed |
| 2026-10-28 | Coordinator | top-level | 20b7413 -> df61df5 | docs/plans/... | plan committed |

Spec: `docs/design.md`; Plan: `docs/plans/2026-10-28-pre-fsso-starter.md`.

Native reviewers (distinct sessions, read-only):
- Spec-document reviewer: PENDING
- Plan-document reviewer: PENDING

Rulings:
- Ruling: `IUnitOfWork.Run` callback receives `IDemoStore` — explicit transaction boundary, no infra types in Application. Cost if wrong: extra wiring.
- Ruling: migrations/count/paging use Microsoft.Data.Sqlite; CRUD uses SqlHydra.Query. Cost: two SQL paths, both real, documented.
- Ruling: static SPA in .NET wwwroot, no SSR. Cost: no SSR in starter.

BLOCKERS: none.

## Phase 0b — document review round 1 and leader rulings

| Time | Role | Session/task | BASE -> HEAD | Outcome |
|---|---|---|---|---|
| 2026-10-28 | Native plan-document reviewer | `ses_e7ccdd20affeXNkXbe53iY36uD` | 20b7413..bb5d226 docs | ❌ NEEDS CHANGES (concise findings; preserved) |
| 2026-10-28 | Native spec-document reviewer | `ses_e7ccdd580ffeVKvKlPbftPJ735` | 20b7413..bb5d226 docs | completed with empty result; rerun required |

Plan reviewer FAIL findings (compressed, all preserved): Task 3 archive before README/scripts commit (Critical); independent toolchain conflict (Critical; REJECTED by leader ruling below); missing cancellation test (Critical); Task 1 oversized/no early HTTP (Important); missing delete rollback/read-no-write proof (Important); OpenAPI not compared/request schema/status matrix (Important); case-insensitive DB uniqueness unproven (Important); pagination determinism unspecified (Important); 500 sentinel leak untested (Important); SqlHydra schema DB mechanism missing (Important); interfaces/DTO casing unspecified (Important); UI states/accessibility/pagination tests missing (Important); SDK config/consumption proof missing (Important); root build/test wiring missing (Important); production wwwroot ignore/single-process/unknown API specifics (Important); BLOCKED rules missing for several steps (Important); RED/GREEN commands not exact (Important); real-DB scope vs app fake contradiction (Important); reviewer distinctness/no self-review (Minor); release-smoke unassigned/SqlHydra diff (Minor).

Leader rulings (binding):
- Archive MUST exclude `.tools`/dependencies, but MAY use the already verified external absolute `PATH`/`DOTNET_ROOT`. Independence means source/assets/scripts resolve from the new root, not toolchain reinstall. Reviewer's "Critical toolchain" claim rejected.
- Archive MUST bind the complete committed source SHA including packaging scripts/README: commit complete Task 3 first, then `git archive HEAD`.
- Fix concrete interface/schema/error/rollback/generation/command gaps; no axe gate, no new dependency/security scanning, no general proof inflation. Browser accessibility = visible labeled controls as contract requires.
- Keep 3 meaningful tasks with runnable checkpoints; add early HTTP create/list smoke and finite timeboxes. Hard ceiling ~60 min remain at ruling time.
- Reviewers must give bounded concise verdicts, not maximal speculative obligations.
- No product implementation until document review closed and leader approval.

Fixes applied: `79bca56` (design contracts/rollback/openapi/archive/wwwroot/fault modes), `565cf73` (plan timeboxes/early HTTP/rollback/read-no-write/OpenAPI equality/case-insensitive/pagination/500 sentinel/SqlHydra migrate-only/exact interfaces/UI states/SDK proof/root wiring/production evidence/BLOCKED/TDD commands/reviewer distinctness/archive ordering). Rerun same reviewers next.

## Phase 0c — re-review round 2 and narrow final review

| Time | Role | Session/task | BASE -> HEAD | Outcome |
|---|---|---|---|---|
| 2026-10-28 | Native spec-document reviewer (same) | `ses_e7ccdd580ffeVKvKlPbftPJ735` | docs @ e45025d | INCOMPLETE: finish:length after 135996 reasoning chars; NO VERDICT recorded; NOT PASS |
| 2026-10-28 | Native plan-document reviewer (same) | `ses_e7ccdd20affeXNkXbe53iY36uD` | docs @ e45025d | ❌ archive/final-SHA ordering still open; all other prior findings closed; toolchain Critical rejected |

Spec findings fixed in `838aaaa`: unique-aware `Insert -> Result` + constraint 2067/19 -> Conflict; cancellation rollback+rethrow not 500; `CreateDemoRequest` shape; exact SqlHydra vs Microsoft.Data.Sqlite split (find/list rows SqlHydra; total+migrations direct); single `AppError` (no DemoError).
Plan finding fixed in `838aaaa`: README + final verification/report at commit A before `git archive HEAD`; archive bound to A; verification appended at B.

Rulings: spec round 2 incomplete is NOT PASS and is preserved; resume SAME spec reviewer with narrow bounded final review (max 3 issues) on amended docs. Same for plan. No repeated surveys. Native task schema lacks model args: inherited verified route is correct. New native children get permission allow; Hermes patches existing.

## Phase 0d — document review CLOSED

| Time | Role | Session/task | HEAD | Outcome |
|---|---|---|---|---|
| 2026-10-28 | Native spec-document reviewer (same session resumed) | `ses_e7ccdd580ffeVKvKlPbftPJ735` | 61d3926 | ✅ APPROVED (all 5 prior findings closed) |
| 2026-10-28 | Native plan-document reviewer (same session resumed) | `ses_e7ccdd20affeXNkXbe53iY36uD` | 61d3926 | ✅ APPROVED (archive ordering closed; no remaining) |

Final document SHA: `61d3926` (plus this ledger commit).
Docs: `docs/design.md`, `docs/plans/2026-10-28-pre-fsso-starter.md`.
State: READY_FOR_LEADER_REVIEW. No product implementation started; waiting for Hermes document approval per order.

## Phase 1 — Task 1 backend

| Time | Role | Session/task | BASE -> HEAD | Commands/evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Coordinator | top-level | 1fcd8d6 | disk restore check; `dotnet restore <legacy> solution` RC0 22.3s | environment ready |
| 2026-10-29 | Native implementer | `ses_e7cc17781ffemes91r9zV4WICC` | 1fcd8d6 -> 7340226 | build/test; 31 passed | DONE_WITH_CONCERNS |
| 2026-10-29 | Coordinator verification | top-level | 7340226 | build RC0; test RC0 31/31 | passed |
| 2026-10-29 | Native spec reviewer | `ses_e7ad113b2ffehnlK7JlfjrGdgP` | 1fcd8d6..7340226 | 3 minor + evidence gaps | Needs fixes |
| 2026-10-29 | Native quality reviewer | `ses_e7acb782effeQkIlfQKDfqUYpa` | 1fcd8d6..7340226 | 2 Important + 2 Minor | Needs fixes |
| 2026-10-29 | Same implementer | `ses_e7cc17781ffemes91r9zV4WICC` | -> 5efe421, e580592 | fixes; build RC0; 31/31 | DONE |
| 2026-10-29 | Coordinator verification | top-level | e580592 | build RC0 21.5s; test RC0 10.9s 31/31; gen diff RC0; OpenAPI required correct | passed |
| 2026-10-29 | Spec reviewer recheck (same) | `ses_e7ad113b2ffehnlK7JlfjrGdgP` | e580592 | all 5 closed | ✅ APPROVED |
| 2026-10-29 | Quality reviewer recheck (same) | `ses_e7acb782effeQkIlfQKDfqUYpa` | e580592 | all 4 closed | ✅ APPROVED |

Preserved failures: earlier `dotnet add` timeout; invalid `dotnet add -v minimal` (help text RC0 not add); macOS `timeout` command missing; aborted restore at pause. None counted as success. Producer RCs used thereafter.

Task 1 APPROVED at `e580592`. Concerns: SqlHydra 5.1.1 omits table declarations; one-line Tables.fs complement disclosed; generated warning suppression prepended deterministically by script.

## Phase 2 — Task 2 frontend/SDK

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Native implementer | `ses_e7abfd7a3ffe9HT87MwPlYISTg` | 59f6473 -> 3060b19 | gen:openapi/gen:sdk RC0; unit5; check0; dev smoke; Playwright4 | DONE_WITH_CONCERNS |
| 2026-10-29 | Same implementer | `ses_e7abfd7a3ffe9HT87MwPlYISTg` | -> c47047d | gen-sdk type assertions; dotnet 31/31 | DONE |
| 2026-10-29 | Spec reviewer | `ses_e7a7ed854ffeK3tcl0gAiV7CkN` | 59f6473..c47047d | 2 findings then closed | ✅ APPROVED |
| 2026-10-29 | Quality reviewer | `ses_e7a79804dffeg62ASWEATv1SmI` | -> e871f66 | detail/delete rejection, stale guard, page clamp; e2e5/5 | ✅ APPROVED |
| 2026-10-29 | Hermes independent | external | 3060b19/c47047d | check0, unit5, browser4/4, generation determinism | supplemental |

Task 2 approved at `e871f66`. Process deviations preserved: one broad pkill early (not claimed compliant); manual Chromium extraction (not clean installer RC); esbuild/lifecycle shutdown diagnostics disclosed.

## Phase 3 — Task 3 production/archive

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Native implementer | `ses_e7a740200ffedHCaCyvhYyuXiI` | e871f66 -> A=696669d, B=e2fccda | build/check/test0; debug smoke; archive independent | DONE_WITH_CONCERNS |
| 2026-10-29 | Spec reviewer | `ses_e7a689bd1ffeMyDw5jmSI34nJ4` | -> A2=6c3ccac/B2=ce962b8 | 3 findings fixed/closed | ✅ APPROVED |
| 2026-10-29 | Quality reviewer | `ses_e7a636240ffeYPUHfzIsvBlrUk` | -> A3=695c074/B3=7980ad5 | signal fail-closed, dynamic ports, exact counts, cleanup | ✅ APPROVED |
| 2026-10-29 | Coordinator verification | top-level | 7980ad5 | `npx pnpm@10.30.3 test` RC0 74.1s: dotnet31, unit5, Playwright5 | passed |
| 2026-10-29 | Hermes independent frozen archive | external | source A=696669d | install/build/test/release RC0 | supplemental; historical source |

Coordinator direct `node scripts/test.mjs` without npm_execpath failed RC1 `spawnSync pnpm ENOENT`; preserved as invocation failure. Correct root command `npx pnpm@10.30.3 test` RC0.

Final product archive: `<repo>/artifacts/fsso-stack-source.tar.gz`, SHA256 `f80ff8de4ecea0d2f0bf59d0f40a966af3c979698d1d4d543341fd79f096d25c`, 145 entries, bound A3 `695c07463def168b892952ca11eafe231292d4af`. Parent historical frozen acceptance source A=696669dc...; A3 delta is docs/env/release-harness fixes only, parent to replay A3.

## Phase 4 — overall freeze and parent acceptance

| Time | Role | Session/task | Target | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Coordinator final verification | top-level | 7980ad5 | `npx pnpm@10.30.3 test` RC0 74.1s; archive 145 entries SHA256 f80ff8...; forbidden paths none | passed |
| 2026-10-29 | Task3 A3 spec recheck | `ses_e7a689bd1ffeMyDw5jmSI34nJ4` | ce962b8..7980ad5 | no regression | ✅ APPROVED |
| 2026-10-29 | Overall frozen reviewer | `ses_e7a59ecddffenIOUXGMjLOUeZO` | 1fcd8d6..edd031f / A3 | no blocking; 4 disclosed limitations | ✅ ACCEPTED |
| 2026-10-29 | Hermes independent A3 | external | archive SHA f80ff8... | install/test/release/check/negative RC0 | ✅ accepted |
| 2026-10-29 | Coordinator docs-only evidence | top-level | final evidence commit | reviewer IDs/receipts corrected; archive not repackaged | FINAL |

Archive: `<repo>/artifacts/fsso-stack-source.tar.gz`, SHA256 `f80ff8de4ecea0d2f0bf59d0f40a966af3c979698d1d4d543341fd79f096d25c`, source A3 `695c07463def168b892952ca11eafe231292d4af`, 145 entries. Parent A3 receipts `artifacts/hermes-resume-acceptance/a3-acceptance.json`; preserved mistyped `negative:control` RC254 separately.

## Phase 5 — FSSO Stack amendment: actual MediatR CQRS

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | User scope amendment | top-level | after `dbf397e` | actual MediatR 12.5.0; no v13/paid license | recorded |
| 2026-10-29 | Coordinator | top-level | `dbf397e` -> docs amendment | spec §3/§3.1/§6, plan Task 2, ledger | amendment written; reviews pending |

Task 1 structural implementation completed at `dbf397e` before this amendment; no in-flight task was interrupted. Task 1 spec/quality reviews remain pending. MediatR 12.5.0 is pinned exactly and must not be replaced; genuine .NET 10/F# incompatibility is a BLOCKED report, not a version switch.
| 2026-10-29 | Native spec reviewer | `ses_e7a215218ffeN2jSE7OEBr9fny` | 454ac09..dbf397e | Task1 scope | ✅ APPROVED |
| 2026-10-29 | Native quality reviewer (preliminary) | `ses_e7a21511dffe3af74YKFAobC11` | dbf397e | 3 Important: ledger paths, falsified history, brand-check no-git fallback | Needs fixes; final verdict deferred until spec PASS + fixes |
| 2026-10-29 | Coordinator doc fixes | top-level | docs amendment | MediatR spec/plan findings + historical placeholders | pending writer brand-check fix/recheck |

### Task 1 closure and MediatR document gate

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Task1 spec reviewer | `ses_e7a215218ffeN2jSE7OEBr9fny` | 454ac09..dbf397e | structural scope | ✅ APPROVED |
| 2026-10-29 | Task1 quality reviewer (final) | `ses_e7a21511dffe3af74YKFAobC11` | dbf397e -> b5b2bc4 | docs/scripts fixes; brand/no-git RC0 | ✅ APPROVED after spec PASS |
| 2026-10-29 | MediatR spec-doc reviewer | `ses_e7a3051eaffeVmNMHpE8l9mrmA` | d15ad0e -> b5b2bc4 | 5 findings closed | ✅ APPROVED |
| 2026-10-29 | MediatR plan-doc reviewer | `ses_e7a3050c6ffeLqMUIiL2aP0zAb` | d15ad0e -> b5b2bc4 | 5 findings closed | ✅ APPROVED |

Quality review was initially dispatched concurrently with spec review at the user's process correction; its first findings are retained as preliminary, not final. Sequence enforced: Task1 spec PASS -> fixes -> final quality PASS. Task 1 approved at `b5b2bc4` for structural scope.

### Shadcn generation acceptance reminder

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | User acceptance reminder | top-level | after `4cb7f7e` | actual official shadcn GENERATION into web, not build/help | recorded |
| 2026-10-29 | Coordinator | top-level | docs gate | spec §2/§6, plan Task2 | implementation pending |

Official CLI `shadcn-svelte@1.7.1` requires a `package.json` in the target cwd; root remains the only package. The root-targeting wrapper may stage a temporary manifest for CLI discovery and must remove it. Network registry `@types/estree@1.0.10` tarball currently 404s in isolated dlx; root pnpm resolves 1.0.9 and installs the CLI successfully.

### Process deviation — system /tmp use

| Time | Role | Session/task | Evidence | Outcome |
|---|---|---|---|---|
| 2026-10-29 | Task2 spec reviewer | `ses_e7a08a313ffehXzGZczw42Tuce` | recheck logs written to `/tmp/fsso-recheck-install.log`, `/tmp/fsso-recheck-check.log` | PROCESS VIOLATION; preserved separately |

The reviewer redirected install/check logs to system `/tmp`, contrary to the no-/tmp rule. Technical recheck verdict remains valid and is not redone. Logs preserved under `<repo>/artifacts/process-deviations/`:
- `fsso-recheck-install.log` SHA256 `d53c1f4662c543bd6c626d4137507f471dbfbadc7e8cfd90e482eafc16067b96`
- `fsso-recheck-check.log` SHA256 `21436a8e41ffacafff6bbdf36f4a9ab5e4215aceb3ad6067d6c41e881e45a93b`

Every later prompt explicitly forbids `/tmp`, including redirects and pipes; commands must use `TMPDIR` and output paths only under project `artifacts/` or approved scratch.

### Task 2 closure (MediatR + shadcn)

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Native implementer (same) | `ses_e7a2bf18cffelNJ3b3OrzgkAhC` | b5b2bc4 -> 4cb7f7e, 45b8bd8, 1e84a25, f1bd97b | MediatR 12.5.0; skeleton generation; clean-check fix; quality fixes | DONE |
| 2026-10-29 | Task2 spec reviewer | `ses_e7a08a313ffehXzGZczw42Tuce` | b5b2bc4..4cb7f7e | 1 Important clean-checkout; fixed/closed | ✅ APPROVED at 1e84a25 |
| 2026-10-29 | Task2 quality reviewer | `ses_e79ff7039ffeNrRdyjLnl7Z6sP` | b5b2bc4..45b8bd8 | 1 Critical shadcn cleanup + 1 Important README; fixed/closed | ✅ APPROVED at f1bd97b |
| 2026-10-29 | Process deviation | `ses_e7a08a313ffehXzGZczw42Tuce` | recheck | `/tmp` logs | VIOLATION preserved; technical verdict not redone |

Task 2 approved at `f1bd97b`: MediatR 12.5.0, 31 original test names + 9 CQRS, official shadcn generation, contract hashes unchanged.

| 2026-10-29 | Task3 quality reviewer | `ses_e79e7ce2bffeXIztQPiu5Bj0Em` | be8cbb1..15a3cc2 | 1 Important count 12->13 | fixed |
| 2026-10-29 | Process note | same reviewer | quality review | attempted `/dev/shm` redirect failed harmlessly; no `/tmp` used | preserved, not redone |

### Task 3 closure

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Task3 spec reviewer | `ses_e79ef2347ffe9uHakB7N7FUKdZ` | 8dfaa37..15a3cc2 | guard bypass fixed/rechecked | ✅ APPROVED |
| 2026-10-29 | Task3 quality reviewer | `ses_e79e7ce2bffeXIztQPiu5Bj0Em` | 8dfaa37..a33e836 | count fix closed | ✅ APPROVED |

Task 3 approved at `a33e836`: fail-closed normal + migrate-only, 13 CQRS/startup tests, bilingual docs, backup/restore RC0.

### Task 4 final freeze

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Task4 implementer | final freeze | 83f7699 -> ea3b8c9 (A); evidence B | archive `artifacts/fsso-stack-source.tar.gz` SHA256 `7d34b1822f11edc6e3ce56a93d4650c76d96c804be4f1bbe3a41c023ec4922a5`; 165 entries; census paths 0/bytes 0; independent install/build/static/API/restart/check/test all RC0 | ✅ COMPLETE |
| 2026-10-29 | Review record | final report | A/B | reviewers: Task1 spec `ses_e7a215218ffeN2jSE7OEBr9fny`, quality `ses_e7a21511dffe3af74YKFAobC11`; Task2 spec `ses_e7a08a313ffehXzGZczw42Tuce`, quality `ses_e79ff7039ffeNrRdyjLnl7Z6sP`; Task3 spec `ses_e79ef2347ffe9uHakB7N7FUKdZ`, quality `ses_e79e7ce2bffeXIztQPiu5Bj0Em`; docs `ses_e7a3051eaffeVmNMHpE8l9mrmA` / `ses_e7a3050c6ffeLqMUIiL2aP0zAb` | ✅ APPROVED |

### External independent actual-archive acceptance

| Time | Role | Target | Evidence | Outcome |
|---|---|---|---|---|
| 2026-10-29 | External independent delivery verification | archive SHA `7d34b1822f11edc6e3ce56a93d4650c76d96c804be4f1bbe3a41c023ec4922a5`; source A `ea3b8c9` | extraction path/content byte map; 130 files/165 entries; legacy 0/0; install/check/test/release-smoke RC0 (31/13/5/5) | ✅ validated actual archive |

## Phase 6 — FSSO modular Task 3 documentation/archive

| Time | Role | Session/task | BASE -> HEAD | Evidence | Outcome |
|---|---|---|---|---|---|
| 2026-10-29 | Task 3 implementer | initial candidate | 1164c14 -> `c49d311d0d3a46ef0b0aa11908373af6c8ba3fcf` | v1 archive `artifacts/fsso-modular-source.tar.gz` SHA256 `8a8db31ea1c7e7094963707404360d5d4923855473033164ef32cc885e72b1b0`; 244 entries; fresh extraction passed install/check/test/backup/browser/one-process/Notes create-get-restart | v1 preserved as historical candidate |
| 2026-10-29 | Independent Task 3 spec reviewer | session not recorded in handoff | `c49d311` | archived report placeholders; premature final status; nested brand-check zero-scan; missing report gates; non-versioned archive; acceptance-evidence gaps | REQUEST_CHANGES |
| 2026-10-29 | Task 3 implementer | defect-fix candidate | `abb5e49` -> A1=`df0830dfe94dae48387855b5924af7b749dbe221`; A2=`4e8f2a65af0ac30de7ff6cc406dee20c89ab967f` | pre-archive checks RC0; v2 archive `<repo>/artifacts/fsso-modular-source-v2.tar.gz` SHA256 `1a594ac3373120c5d89d209c9678c150ed4e7f4ad8b96f0a5e1249695a5cfbb6` (244 entries); fresh extraction `artifacts/independence/independent-4e8f2a6-...-90163` install/check/build/test/backup/browser/one-process/Notes/restart RC0; clean nested brand 186 paths RC0; negative fixture RC1 | IN REVIEW |
| 2026-10-29 | Task 3 implementer | v3 parent-evidence correction | `95a89b3` -> C1=`ab650ff5a8c7d94a763f8f563532b6b55d19181a` | stale v1 parent references removed; valid v2 parent logs cited as supplemental only with no separate process-exit caveat; primary v2 package summary `exit=0` + manual `rc.txt`; standalone Playwright 5/RC0, dev/release smoke RC0 bound to `4e8f2a6`; v3 archive/extraction pending at C1 | IN REVIEW |
| 2026-10-29 | Task 3 implementer | v3 archive evidence | C1=`ab650ff5a8c7d94a763f8f563532b6b55d19181a` -> report-only follow-up D | v3 archive `<repo>/artifacts/fsso-modular-source-v3.tar.gz` SHA256 `32ea83fd8eef541db83ea5a7e7d3f1a51c41436735d43e1a93d8561017883e0b` (244 entries); extraction `artifacts/independence/independent-ab650ff5a8c7d94a763f8f563532b6b55d19181a-2026-10-29T10-01-31-904Z-95125`; install/check/build/test RC0; 5/6/20/13/8; frontend 5; browser 5; backup/restore; one-process; Notes create/get/restart; zero brand 186/0/0; nested clean 186 RC0; negative 187 RC1; dev/release/playwright RC0; placeholder/status gates RC0 | IN REVIEW |
| 2026-10-29 | Task 3 spec reviewer (v3) | `ses_e78f83139ffeBdW16j9mtVBw9c` | source `ab650ff5a8c7d94a763f8f563532b6b55d19181a` + v3 archive | source `ab650ff`/v3 only; not transferred to v4 | PASS (v3 only) |
| 2026-10-29 | Task 3 quality reviewer (v3) | `ses_e78db35ddffeMJOA4p5ec3WJ3V` | source `ab650ff`/v3 candidate | module-copy guide, independent-host acceptance wording, v2/v3 review-log binding; minor 4 nonblocking | REQUEST_CHANGES |
| 2026-10-29 | Task 3 implementer | v4 targeted quality correction | `01b0603` -> C2=pre-archive commit carrying this row | both READMEs corrected for Composition/Host/store registration; independent-host create/list/get vs release/full-test delete clarified; review log binds v2/v3/v4; scratch redaction clarified; v4 archive/extraction pending | IN REVIEW |
| 2026-10-29 | Task 3 implementer | v4 archive evidence | C2=`a155486d0d35e5f2fd870c3b7fdb1af97bd27466` -> report-only follow-up | v4 archive `<repo>/artifacts/fsso-modular-source-v4.tar.gz` SHA256 `3a1adff96c3fe7c1ed9090030b8e637daaed6d406ddbde6dfb87142bbde23f2c` (244 entries); extraction `artifacts/independence/independent-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765`; install/check/build/test RC0; 5/6/20/13/8; frontend 5; browser 5; backup/restore; one-process; Notes create/get/restart; zero brand 186/0/0; nested clean 186 RC0; negative 187 RC1; dev/release/playwright RC0; placeholder/status gates RC0 | IN REVIEW |
| 2026-10-29 | Task 3 spec reviewer (v4) | NOT REVIEWED | docs-only v4 candidate | prior v3 PASS not transferred | PENDING |
| 2026-10-29 | Task 3 quality reviewer (v4) | PENDING | docs-only v4 candidate | same | PENDING (no verdict invented) |
| 2026-10-29 | Final independent integration reviewer | PENDING | v4 archive + fresh extraction | actual v4 archive extraction | PENDING (no verdict invented) |

Task 3 remains IN REVIEW. The Task 3 spec PASS is bound to `ab650ff`/v3 only and is not transferred to the v4 candidate. v4 spec is not reviewed; v4 quality and final integration are pending. v1, v2, v3, and all prior extractions/fixtures/logs are preserved and must not be overwritten or deleted. The v4 docs-only correction fixes the module-copy guide, independent-host acceptance wording, review-log v2/v3/v4 binding, and scratch-redaction clarification. v4 source `a155486d0d35e5f2fd870c3b7fdb1af97bd27466` produced `<repo>/artifacts/fsso-modular-source-v4.tar.gz` SHA256 `3a1adff96c3fe7c1ed9090030b8e637daaed6d406ddbde6dfb87142bbde23f2c` (244 entries) and fresh extraction `artifacts/independence/independent-a155486d0d35e5f2fd870c3b7fdb1af97bd27466-2026-10-29T10-26-44-057Z-3765`; package/install/check/build/test, backup/restore, browser 5, one-process, Notes create/get/restart, zero-brand census (186 files, 0 paths/bytes), nested clean brand (186 paths, RC0), preserved negative brand (187 paths, RC1), dev/release smoke, standalone Playwright 5, and placeholder/status gates all passed. v4 spec, v4 quality, and final integration remain pending. v3 source `ab650ff5a8c7d94a763f8f563532b6b55d19181a` produced `<repo>/artifacts/fsso-modular-source-v3.tar.gz` SHA256 `32ea83fd8eef541db83ea5a7e7d3f1a51c41436735d43e1a93d8561017883e0b` (244 entries) and fresh extraction `artifacts/independence/independent-ab650ff5a8c7d94a763f8f563532b6b55d19181a-2026-10-29T10-01-31-904Z-95125`. v3 package/install/check/build/test, backup/restore, browser 5, one-process, Notes create/get/restart, zero-brand census (186 files, 0 paths/bytes), nested clean brand (186 paths, RC0), preserved negative brand (187 paths, RC1), dev/release smoke, standalone Playwright 5, and placeholder/status gates all passed. The valid v2 parent logs under `/Users/somhairle/.hermes/cache/scratch/fsso-final-v2-parent.UErKdZ/` are supplemental only and lack a separate process-exit line; primary true-cwd/RC evidence is the v2/v3 package summary `exit=0` plus manual `rc.txt`. Supplemental v2 evidence bound to `4e8f2a6`: standalone Playwright `parent-playwright.log` 5 passed/RC0, dev smoke `parent-dev.log` RC0, release smoke `parent-release.log` RC0. Full `pnpm test` is intentionally not run in the main repository; full test evidence is the fresh extraction plus the independent parent runs. Disclosed deviations: Task 2 generated-artifact overwrite with no user DB impact; historical reviewer `/tmp` logs preserved under `artifacts/process-deviations/`; preserved v2 archive retains its superseded in-archive parent-path wording and is not rewritten. No push/deploy/real DB/secrets.
