# FSSO 手写源码中文注释规范与架构阅读指南规格

状态：直接实施规格，基线 `bf647e31f1cd0395d784d90935f37d7e56d27b80`（tracked tree 干净，`git ls-files` 186 项；本规格/计划仍为当前未跟踪评审文档，最终作为交付物提交并纳入清单）。
范围：仅注释、新增中文说明文档、README 指南链接，以及为注释覆盖验收新增的测试脚本。禁止改变业务逻辑、API、SQL 语义、配置值、运行行为、原英文注释含义、项目结构、生成物、锁文件、fixture、契约和自动生成 OpenAPI/SDK/SqlHydra。

## 1. 目标

1. 为所有可安全注释的手写源码补充精确、非模板化的中文“文件职责”注释；关键公共类型、函数、端口、事务边界、迁移、平台脚本补充中文解释。
2. 新增 `docs/comment-inventory.zh.md`：逐文件列出 186 个 tracked 路径的分类、用途、覆盖证明，或不可注释的真实来源/原因。禁止用目录通配代替逐文件清单。
3. 新增 `docs/architecture-guide.zh.md`：面向初学者，按真实文件/函数追踪 Demo 创建与 Notes 路径，解释 API → ISender → handler → port → store → `SqliteUnitOfWork`、跨模块事务、失败/取消回滚、模块注册、fsproj 编译顺序、DTO/OpenAPI/SDK、迁移顺序、开发/生产/备份边界、测试意图、新增模块流程。
4. `README.md`/`README_zh.md` 只新增对应指南链接，保留原有事实与内容。

## 2. 派生架构基线例外（父级裁决，优先于旧 BLOCKED 裁决）

`tests/demo-module-files.sha256` 是派生的架构测试基线，不是用户数据或原始业务 fixture。允许对清单内 33 个 Demo/旧测试源码加入合法中文注释，并仅对实际因此改变的条目重新计算 SHA256。要求：

- 路径集合不得增减；未触及文件哈希必须不变；`scripts/architecture-check.mjs` 的运行逻辑及其测试断言不得修改/弱化（合法中文注释不在此限）。
- 保存基线清单原始字节副本 `docs/evidence/demo-module-files.baseline.bf647e31.sha256`；在 `docs/comment-inventory.zh.md` 逐文件记录旧/新 hash、注释剥离等价证据与人工 diff 结论。
- 每个文件只允许安全注释差异；不得用更新 hash 代替等价证明。
- 这是用户任务对派生基线的唯一例外；JSON/lock/生成物/真正精确 fixture/业务数据库仍冻结。

## 2.1 可注释文件分类

### A. 必须逐文件注释（手写源码/脚本/配置）

- F#：`src/**/*.fs`（`src/Shared/Fsso.Database/Generated/SqlHydra.fs` 除外）、`tests/**/*.fs`；其中 manifest 33 文件允许安全注释并同步派生 hash。
- 项目/构建配置：`src/**/*.fsproj`、`tests/**/*.fsproj`、`Directory.Build.props`、`FssoStack.slnx`；已存在 shebang 的脚本保留第一行。manifest 内 fsproj 同样可安全注释并同步 hash。
- SQL：`src/Modules/*/Infrastructure/Migrations/*.sql`，仅增加 `--` 注释，不改语句。
- 前端手写：`web/src/App.svelte`、`web/src/app.css`、`web/src/main.ts`、`web/src/vite-env.d.ts`、`web/src/lib/**/*.ts`（`web/src/lib/api/generated/**` 除外）、`web/e2e/*.ts|mjs`、`web/*.ts|js`、`web/index.html`。`web/src/lib/components/ui/**` 与 `web/src/lib/utils.ts` 是 shadcn-svelte 生成/复制代码，按 B 类冻结，不加注释。
- Node 脚本：`scripts/*.mjs`、`scripts/gen-sqlhydra.sh`。
- 其他可注释配置：`.gitignore`、`sqlhydra.toml`、`.config/dotnet-tools.json` 之外的可安全注释项；HTML 用 `<!-- -->`，YAML 若语法允许用 `#`。

### B. 不可注释或按来源冻结（必须在清单逐项说明）

- JSON 数据/配置：`package.json`、`web/components.json`、`web/tsconfig.json`、`openapi/openapi.json`、`scripts/*.json`、`tests/original-test-names.json`、`docs/evidence/*.json`、`.config/dotnet-tools.json`；JSON 文件不支持注释，`web/tsconfig.json` 属于 TypeScript JSONC（语法支持注释）但为字节稳定有意保持无注释，且部分为契约/生成快照。
- 锁文件：`pnpm-lock.yaml`（工具生成，不能手改）。
- 生成代码：`web/src/lib/api/generated/**`（OpenAPI SDK 生成）、`src/Shared/Fsso.Database/Generated/SqlHydra.fs`（SqlHydra 生成）。
- `scripts/architecture-check.mjs`：运行逻辑/现有断言冻结；属于人手写脚本，允许且要求安全中文首部注释，不得改变逻辑或断言。
- 精确 fixture / 哈希清单：`tests/demo-module-files.sha256`（仅派生 hash 条目按 §2 更新，路径集合不变）、`scripts/demo-contract.json`、`scripts/demo-sdk-contract.json`、`scripts/contract-hashes.json`。
- shadcn-svelte 生成/复制代码：`web/src/lib/components/ui/**`、`web/src/lib/utils.ts`；多数文件由官方 CLI/模板生成、手工注释会被再生覆盖，但 `alert-dialog/alert-dialog.svelte` 是手写组合包装，不是 CLI registry 目标，冻结理由以清单为准。
- 二进制/图片/供应商代码：本仓库当前无 tracked 二进制；若清单发现则逐项标记。
- Markdown 历史文档：不注释源码；新增指南与清单为独立文档。README 只加链接。

## 3. 注释格式与质量

- 每个 A 类文件在语法安全位置增加一段中文“文件职责”，至少包含：职责、边界（依赖/不依赖）、输入/输出或关键约束。统一标记 `文件职责：`。
- 标记位置：F# 在 `namespace`/`module` 前或文件顶部 `//`；TS/JS/MJS 用 `//`；Svelte `<script>` 内用 `//`，顶层用 `<!-- -->`，`<style>` 内用 `/* */`；CSS 用 `/* */`；SQL 用 `--` 独立行；XML/fsproj/.slnx 用整行 `<!-- -->`，不放进属性、不重排 `<Compile Include>`/属性顺序；HTML 注释放在 `<!doctype html>` 之后；TOML/.gitignore 用 `#`；shell 用 `#` 且在 shebang 后。保留编码/BOM/换行。若 `.slnx` 注释导致构建失败，则改为 B 类并记录。
- 禁止统一模板灌水：不同文件必须说明其真实角色、为何存在、与相邻层的关系、非显然约束。
- 关键公共项补充中文注释：领域校验、AppError、IUnitOfWork/IWorkScope、事务提交/回滚、迁移版本、MediatR 注册、endpoint 映射、DTO/OpenAPI 变换、SDK 使用、脚本安全边界。
- 保留既有英文注释原意；可补充中文，不删除/改写已有英文语义。保留 fail-closed 旧标识拼接兼容行为。
- 不添加“支持临床/金融业务”等不实声明；本项目是合成示例。

## 4. 覆盖验收

- 新建 `scripts/comment-coverage-check.mjs`：读取 `docs/comment-inventory.zh.md` 的逐文件清单，校验：
  - 清单覆盖基线 186 路径 + 本次全部新增交付文件（spec/plan/清单/覆盖与等价脚本/指南/基线副本）的并集，无遗漏/重复/通配；在无 `.git` 的干净解包环境用文件系统扫描同一并集。
  - 提供分阶段模式：`--inventory` 只校验清单与 B 理由/hash；`--phase backend|frontend|full` 校验对应 A 类标记；仅 full 与最终解包要求全量 RC0。
  - 新增 `scripts/comment-equivalence-check.mjs`：对 F#/TS/JS/MJS/XML/fsproj/.slnx/SQL/CSS/HTML/Svelte 做语法感知注释剥离后与基线比较；Svelte 分 `<script>`/`<style>`/markup 上下文。
  - A 类每个文件存在 `文件职责：` 标记，中文职责内容至少 40 个中文字符或等价信息，且每个文件的职责句子在全部文件中不重复；B 类文件有明确理由。
  - 对生成/锁/fixture 文件做字节哈希记录或与冻结哈希比较，禁止改动；manifest 例外按 §2 校验路径集合、未触及 hash、旧/新 hash 记录与剥离等价。负控证明缺失标记与重复模板句子会失败。
- 用语言感知剥离注释或 AST 对比：F#/TS/JS/MJS/Svelte/SQL 等比较剥离注释后的 token/文本；Svelte/XML/SQL 难解析者逐文件人工 diff。
- 锁文件、fixture、API 契约、生成文件字节必须与基线一致（新增/docs/注释文件除外）。
- `node scripts/comment-coverage-check.mjs` 必须在仓库与干净解包环境均可执行；与 `pnpm check`、`pnpm test`、release smoke、契约/生成哈希验证一起在干净解压冻结包中真实运行并记录 RC。

## 5. 交付

- 使用现有 `FSSO_ARCHIVE_PATH=artifacts/fsso-modular-source-v5.tar.gz` 生成新版本化包，不修改 `package-source.mjs` 行为、不覆盖旧包；手工断言新指南/清单/脚本在包内；记录绝对路径、SHA256、完整文件清单、冻结源码 SHA。
- README/README_zh 增加中英文链接。
- 最终独立整体审查只读，确认注释准确性、无行为变化、文档与真实代码一致。
