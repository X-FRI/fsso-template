# Final report

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Date: 2026-10-29  
Branch: `feature/fsharp-fullstack`

## Frozen source

Frozen product source commit A3 = `695c07463def168b892952ca11eafe231292d4af`. Archive is generated from A3 only; B3 records verification. Later evidence-only docs commits do not repackage the archive. Final evidence commit is recorded in the ledger.

## Actual evidence (producer RCs)

| Command | RC | Counts / result |
|---|---|---|
| `npx --yes pnpm@10.30.3 build` | 0 | frontend build + `dotnet publish`; published `<renamed> Host.dll` + `wwwroot/index.html`; log `artifacts/task3-build-a3.log` |
| `npx --yes pnpm@10.30.3 test` | 0 | negative control 0; dotnet passed=31 failed=0 skipped=0 total=31; frontend unit passed=5; Playwright passed=5 on dynamic published-app port 58917; log `artifacts/task3-test-a3.log`, `artifacts/test-summary.log` |
| `node scripts/negative-control.mjs` | 0 | child killed by SIGKILL reported as RC=1 signal=SIGKILL, proving `runLogged` fail-closed; log `artifacts/task3-negative-control.log` |
| `node scripts/release-smoke.mjs` | 0 | dynamic ports 58966 then 58978; single process/no Node child; static+assets; API CRUD; JSON 404; pagination 400; restart persistence; log `artifacts/task3-release-a3.log` |
| `<legacy>_SCRATCH=<approved> npx --yes pnpm@10.30.3 package:source` | 0 | 145 entries; required files present; forbidden paths absent; independent install 0, build 0, static 0, API create/list/400/404/pagination 0, restart 0 (ports 59008 then 59013) |

`test.mjs` now uses `<legacy>_TEST_PORT=0` by default and discovers the actual listen URL; it fails closed if dotnet/unit/Playwright counts are missing or not exactly 31/5/5. `package-source.mjs` uses `<legacy>_PACKAGE_PORT=0` and discovers each start/restart URL. `build.mjs` throws instead of `process.exit` inside `try`, so `src/Host/wwwroot` cleanup always runs.

## Archive

- Path: `<repo>/artifacts/fsso-stack-source.tar.gz`
- Bound source SHA: A3 `695c07463def168b892952ca11eafe231292d4af`
- Must contain fixed `README.md`, `docs/reviews/final-report.md`, `scripts/lib.mjs`, `scripts/negative-control.mjs`, `scripts/build.mjs`, `scripts/test.mjs`, `scripts/release-smoke.mjs`, `scripts/package-source.mjs`.
- Independent extraction: `<scratch>/independent-695c07463def168b892952ca11eafe231292d4af`; install/build/static/API/restart all RC 0.

## B3 verification note

A3 source is frozen at `695c074`. Archive and independent results were produced after commit A3; B3 only records them. Working tree was clean at packaging.

## Review status (all closed)

Document reviews:
- Spec document: `ses_e7ccdd580ffeVKvKlPbftPJ735` — approved.
- Plan document: `ses_e7ccdd20affeXNkXbe53iY36uD` — approved.

Task 1:
- Spec-compliance: `ses_e7ad113b2ffehnlK7JlfjrGdgP` — approved after fixes.
- Code-quality: `ses_e7acb782effeQkIlfQKDfqUYpa` — approved after fixes.
- Source at approval: `e580592`.

Task 2:
- Spec-compliance: `ses_e7a7ed854ffeK3tcl0gAiV7CkN` — approved after fixes.
- Code-quality: `ses_e7a79804dffeg62ASWEATv1SmI` — approved after fixes.
- Source at approval: `e871f66`.

Task 3:
- Spec-compliance: `ses_e7a689bd1ffeMyDw5jmSI34nJ4` — approved for dynamic-port/final-report/README fixes; A3 delta is quality-fix only.
- Code-quality: `ses_e7a636240ffeYPUHfzIsvBlrUk` — approved for A3 source `695c074` (verdict recorded at B3 `7980ad5`).
- Overall frozen review: `ses_e7a59ecddffenIOUXGMjLOUeZO` — ✅ ACCEPTED, no blocking findings.

## Independent A3 acceptance

Parent/Hermes independently accepted the final A3 archive: SHA256 `f80ff8de4ecea0d2f0bf59d0f40a966af3c979698d1d4d543341fd79f096d25c`, source `695c07463def168b892952ca11eafe231292d4af`, 145 entries, extracted fresh `hermes-a3-q9014s0m` with own dependency install RC0; `pnpm test` RC0 81.45s (F#31/31, unit5/5, published Chromium5/5), `release-smoke` RC0 13.67s dynamic ports/restart/CRUD/JSON404/single .NET, `pnpm check` RC0 zero warnings/errors. Receipts: `artifacts/hermes-resume-acceptance/a3-acceptance.json` plus `a3-*.log`. The earlier mistyped `negative:control` script RC254 is preserved separately; correct node/negative-control command was green.

## Known OPEN gates / concerns

- All document/Task 1/Task 2/Task 3 reviewer session IDs and verdicts are now recorded above and in `docs/ledger.md`; no IDs remain unavailable.
- Playwright Chromium was manually extracted in Task 2 (not a clean installer RC); project-local browser only.
- SqlHydra 5.1.1 generated no table declarations, so `Tables.fs` keeps one hand-written `table<main.demos>` complement; generated types/readers/factory are real and used.
- Task 3 exceeded its original timebox; evidence is real but spread over a longer session.
- Independent archive verification depends on network/cached pnpm dependencies; the real command returned RC 0 and used external absolute `PATH`/`DOTNET_ROOT`.
