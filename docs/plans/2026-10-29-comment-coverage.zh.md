# FSSO 中文注释覆盖与架构指南实施计划

> 基线 `bf647e31f1cd0395d784d90935f37d7e56d27b80`，`git ls-files` 186 项。串行单 writer；每任务先 spec reviewer PASS，再由不同 code-quality reviewer PASS；顶层只写协调文档。

## 派生架构基线例外（父级裁决）

`tests/demo-module-files.sha256` 是派生架构测试基线，不是用户数据/原始业务 fixture。允许注释其列出的 33 个 Demo/旧测试源码；仅对实际改变条目更新 hash，路径集合不得变，未触及 hash 不变，`architecture-check.mjs` 运行逻辑/断言不改，但允许并纳入安全首部注释。保存原始清单副本 `docs/evidence/demo-module-files.baseline.bf647e31.sha256`；清单文档记录逐文件旧/新 hash + 剥离等价 + 人工 diff。每个文件只允许注释差异。`package-source.mjs` 运行逻辑不改（可加首部注释）；打包用现有 `FSSO_ARCHIVE_PATH=artifacts/fsso-modular-source-v5.tar.gz`，先提交、再 `git archive`。

## 全局约束

- 只改注释、新增中文文档、README 链接、注释覆盖测试脚本；禁止改行为/结构/契约/生成物/锁/fixture/配置值。
- 不运行会改生成语义的生成器。保留 shebang、XML 属性、fsproj 顺序、YAML 行为。
- 工具链仅：`PATH="$PWD/.tools/bin:$PWD/.tools/dotnet:/Users/somhairle/.hermes/tools/node-26.7.0-darwin-x64/bin:$PATH"`，`DOTNET_ROOT="$PWD/.tools/dotnet"`，`PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/playwright-browsers"`；`TMPDIR="$PWD/artifacts/tmp"`（先建）。记录 `which node`、`node --version`、`which dotnet`、`dotnet --version`、`pnpm --version`。
- 无 `/tmp`、无 wide pkill、无 push/deploy/凭据/真实 DB。
- 每个 A 类文件逐文件职责注释；B 类逐文件列出冻结理由。

## Task 1 — 全量清单、覆盖脚本、构建/脚本配置注释

**Files:** 新增 `docs/comment-inventory.zh.md`、`scripts/comment-coverage-check.mjs`、`scripts/comment-equivalence-check.mjs`、`docs/evidence/demo-module-files.baseline.bf647e31.sha256`；注释 `.gitignore`、`Directory.Build.props`、`FssoStack.slnx`、`sqlhydra.toml`、全部 `scripts/*.mjs`（均仅注释；`architecture-check.mjs`、`package-source.mjs` 不改逻辑/断言）、`scripts/gen-sqlhydra.sh`、全部 `src/**/*.fsproj`、`tests/**/*.fsproj`、`web/index.html`、`web/*.js|ts`（非生成）、`web/svelte.config.js`、`web/tailwind.config.js`、`web/postcss.config.js`、`web/vite.config.ts`、`web/playwright.config.ts`、`web/openapi-ts.config.ts`；`web/tsconfig.json` 按 JSON 例外说明。先复制原 manifest 并 `cmp` 验证，再编辑；提交 spec/plan 等交付文件后运行 full 模式。
**行为：** 清单逐项 186 路径；覆盖脚本真校验；脚本/配置职责注释精确；B 类生成/锁/fixture 理由真实；README 链接留到 Task 4。
**验收：** `node scripts/comment-coverage-check.mjs --inventory` RC0；清单覆盖基线 186 ∪ 新交付文件；生成/锁/fixture 哈希与基线一致；`for f in scripts/*.mjs; do node --check "$f" || exit 1; done` RC0（含无效第二文件负控）；`dotnet build` RC0。

## Task 2 — 后端手写 F# / SQL / 迁移注释

**Files:** `src/**/*.fs`（除 Generated/SqlHydra.fs）、全部 `src/Modules/*/Infrastructure/Migrations/*.sql`；manifest 33 文件可安全注释并按 §2 更新对应 hash。
**行为：** 每个文件中文职责/边界/输入输出；领域校验、AppError、port、handler、事务、store、迁移版本、OpenAPI/模块注册注释准确；SQL 仅 `--` 注释且语句不变；迁移序号/资源逻辑名不变。
**验收：** 基线文件用 `git show bf647e31:<path>` 取副本；`node scripts/comment-equivalence-check.mjs --phase backend` RC0；SQL/fsproj 剥离后 token 一致；`dotnet build -warnaserror` RC0；原测试 identity 不变；`node scripts/comment-coverage-check.mjs --phase backend` RC0。

## Task 3 — 测试、前端手写源码注释

**Files:** 全部 `tests/**/*.fs`、`web/src/App.svelte`、`web/src/app.css`、`web/src/main.ts`、`web/src/vite-env.d.ts`、`web/src/lib/**/*.ts`（generated 除外）、`web/e2e/*.ts|mjs`。manifest 内旧测试允许注释并同步 hash；shadcn UI/utils 为生成/复制代码，B 类不加注释。
**行为：** 测试文件说明测试意图/隔离/断言；Svelte/TS/CSS 说明组件/状态/错误边界；保留 svelte 语法与 DOM/testid/label；不新增 UI/测试。
**验收：** `node scripts/comment-equivalence-check.mjs --phase frontend` RC0；Svelte/XML/SQL 人工 diff 补充；`svelte-check` RC0；`pnpm exec vitest run --root web web/src` 原 5 用例；`pnpm exec playwright test --list --config web/playwright.config.ts` 断言 5；`node scripts/comment-coverage-check.mjs --phase frontend` RC0。

## Task 4 — 架构阅读指南、README 链接、包与全量复验

**Files:** 新增 `docs/architecture-guide.zh.md`；修改 `README.md`、`README_zh.md` 仅加链接；更新清单覆盖证明；不修改 `package-source.mjs` 逻辑、不覆盖旧包。Task4 先提交精确文件并确认 clean，再用现有 `FSSO_ARCHIVE_PATH=artifacts/fsso-modular-source-v5.tar.gz` 生成包并手工断言新文档入包。记录最终 commit/包 SHA/完整文件清单/未覆盖例外。
**行为：** 指南严格按实际 `src/` 文件函数追踪 Demo/Notes、ISender/handler/port/store/UoW、跨模块事务/回滚、模块注册、fsproj 顺序、DTO/OpenAPI/SDK、迁移、开发/生产/备份/测试/新模块；README 双语链接；不得写临床/金融支持。
**验收：** Task4 先提交精确文件（含 spec/plan/新文档），`git status --porcelain` 空后记录 `git rev-parse HEAD`；`FSSO_ARCHIVE_PATH=artifacts/fsso-modular-source-v5.tar.gz node scripts/package-source.mjs`；`tar -tzf` 断言新文档/脚本在包内。解压后用 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm test`（31+13+8+5+5、回滚、备份、契约）、`pnpm release:smoke`；无 git 解包 `node scripts/comment-coverage-check.mjs --phase full` RC0；`node scripts/comment-equivalence-check.mjs --phase full` RC0；基线/当前 manifest 路径集合、未触及 hash、旧/新 hash 记录；记录命令/cwd/RC/日志、分类/未覆盖清单、真实子会话 ID/模型/结论；包 SHA256/绝对路径/完整文件清单。最终仅整体只读审查 PASS 后可 READY，首行 `READY_FOR_LEADER_REVIEW` 或 `BLOCKED: 原因`（如实列出 manifest 例外之外任何缺口）。

## Review gates

每任务：writer → native fresh spec reviewer (read-only) → native different code-quality reviewer (read-only) → same writer fixes → targeted rereview。最终冻结后独立整体审查。记录实际 session ID/parentID/model/verdict。
