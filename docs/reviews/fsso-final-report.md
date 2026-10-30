# FSSO Stack — Final Task 4 Report

Status: source A frozen; final archive/independent verification is recorded in **Evidence B** below. Branch: `feature/fsharp-fullstack`.
Source A: this commit (exact SHA recorded in Evidence B). The earlier interim independent run at `be8cbb1` is **not** final evidence and is superseded by the archive run for A.

## Review record

| Scope | Reviewer session | Verdict |
|---|---|---|
| Task 1 spec | `ses_e7a215218ffeN2jSE7OEBr9fny` | approved |
| Task 1 quality | `ses_e7a21511dffe3af74YKFAobC11` | approved |
| Task 2 spec | `ses_e7a08a313ffehXzGZczw42Tuce` | approved after clean-checkout fix |
| Task 2 quality | `ses_e79ff7039ffeNrRdyjLnl7Z6sP` | approved after shadcn/README fixes |
| Task 3 spec | `ses_e79ef2347ffe9uHakB7N7FUKdZ` | approved after migrate-only fix |
| Task 3 quality | `ses_e79e7ce2bffeXIztQPiu5Bj0Em` | approved after count fix |
| Document reviewers | `ses_e7a3051eaffeVmNMHpE8l9mrmA`, `ses_e7a3050c6ffeLqMUIiL2aP0zAb` | document review |

## Current evidence before archive

- Original backend tests: 31 exact names retained (Domain 5, Application 6, Integration 20).
- Dedicated CQRS/startup tests: 13, including fail-closed normal startup and `--migrate-only`.
- Frontend unit: 5; Playwright: 5.
- `pnpm check`: RC 0 (brand, structure, MediatR, contract, `dotnet build -warnaserror`, svelte-check).
- `pnpm test`: RC 0 (build/publish, negative control, exact 31 originals, 13 CQRS, backup/restore, 5 unit, 5 Playwright).
- `pnpm build`: RC 0.
- `node scripts/sqlite-backup-check.mjs`: RC 0 (synthetic HTTP create -> `.backup` -> `.restore` -> restored readback).
- MediatR exactly `12.5.0`, Apache-2.0; 13+/paid registration rejected by `check-mediatr`.
- Official `shadcn-svelte@1.7.1` generated `web/src/lib/components/ui/skeleton/{skeleton.svelte,index.ts}`.
- Generation hashes: OpenAPI `33df6b8214ad3db8cd7582647cbc0c68db02483664a0edf3b995c2feca9ee681`; SDK `sdk.gen.ts` `8c9945d74485f3067370a32ece1f5db7a9484de6045e42ce5ffc4283309ab9a0`; SqlHydra `061eb397e980702ee3ac5d5ffae375e7eb5d09a413b1a0efca68e7f727db9085`; 17-file contract manifest enforced.
- Bilingual READMEs are complete and equivalent in facts. Historical pre-FSSO docs are marked `HISTORICAL (pre-FSSO)`. No legacy token. No CI workflow.

## OPEN gates (resolved by Evidence B)

- Final archive SHA256, entry count, required/forbidden assertions.
- Path and decompressed-member byte census for the legacy term.
- Fresh independent archive extraction: frozen install, build, start, API/restart, `pnpm check`, and `pnpm test` if time.
- Source A/B commit SHAs and final ledger entry.

No archive hash is claimed before the archive is generated.

## Evidence B — final archive and independent verification

Final status: **COMPLETE**. Evidence B is outside the frozen archive; the archive contains the report as of source A.

- Source A: `ea3b8c991df3b88b377225b9d9c5caff0f0d0921` (`ea3b8c9`).
- Evidence B: this commit (exact SHA recorded by `git log`/final handoff).
- Archive: `artifacts/fsso-stack-source.tar.gz`.
- Archive SHA256: `7d34b1822f11edc6e3ce56a93d4650c76d96c804be4f1bbe3a41c023ec4922a5`.
- Archive size: 160,901 bytes; 165 entries.
- Package command: `FSSO_SCRATCH=<approved-scratch>/final-package npx --yes pnpm@10.30.3 package:source` → RC 0.
- Archive assertions: required files present; forbidden paths absent; no `web/package.json`, no `apps/`, no workspace file, no nested lockfile; `README.md`, `README_zh.md`, skeleton component files, and `docs/reviews/fsso-final-report.md` present.
- Census: 165 paths scanned, **0** legacy matches in paths, **0** legacy byte occurrences across decompressed member contents (`tar -xOzf`). No compressed-only claim.
- Independent extraction: `<approved-scratch>/final-package/independent-ea3b8c991df3b88b377225b9d9c5caff0f0d0921`.
- Tooling: `which dotnet` → `<repo>/.tools/dotnet/dotnet`; `dotnet --version` → `10.0.403`; Node `26.7.0`; pnpm `10.30.3`.
- Independent `pnpm install --frozen-lockfile`: RC 0.
- Independent `pnpm build`: RC 0.
- Independent static index/assets: RC 0.
- Independent API create/list/400/404/pagination: RC 0.
- Independent restart persistence: RC 0.
- Independent `pnpm check`: RC 0 (brand filesystem fallback 130 paths, structure, MediatR, contract, dotnet build, svelte-check).
- Independent `pnpm test`: RC 0 (31 original exact, 13 CQRS/startup, backup/restore RC 0, 5 unit, 5 Playwright).
- The interim independent run at `be8cbb1` is superseded and is not final evidence.
- OPEN gates: none. No repackage after Evidence B.

## External independent delivery verification

After Evidence B, an independent extraction of the actual `artifacts/fsso-stack-source.tar.gz` was performed at `<approved-scratch>/fsso-independent-delivery-ea3b8c9/source` (logs `.../fsso-independent-delivery-ea3b8c9/*.log`):

- Archive SHA256: `7d34b1822f11edc6e3ce56a93d4650c76d96c804be4f1bbe3a41c023ec4922a5`.
- Extracted path/content byte map matches `git archive ea3b8c9` (130 files, 165 entries).
- Case-insensitive legacy paths/files: 0; forbidden directories: 0; `README_zh.md` present.
- Frozen `pnpm install` RC0; `pnpm check` RC0; `pnpm test` RC0 (backend 31, CQRS 13, frontend 5, browser 5, backup/restore RC0).
- `release-smoke` RC0: single process, CRUD and restart persistence.

This validates the actual delivery archive, not a worker self-report. The archive was not repackaged.
