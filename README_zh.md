# FSSO Stack

FSSO Stack 是一个可运行的 F# + Svelte 全栈启动器，按编译期强制的业务模块组织。**FSSO** 是本项目对 **F# + Svelte + SQLite + OpenAPI** 的简称，不是行业标准缩写。

仓库包含两个后端模块：既有的 **Demo** 创建/详情/列表/删除流程，以及刻意做小的 **Notes** 示例（一个命令、一个查询）。它演示真实 SQLite 持久化与只向前迁移、MediatR 12.5.0 CQRS、SqlHydra 查询、跨模块共享 unit of work、自动生成的 OpenAPI/TypeScript SDK，以及 SvelteKit 界面。生产运行 ASP.NET Core API 与 SvelteKit Node 服务；Node 代理 `/api`，浏览器只看到一个源。

> **范围与非目标：** 这是启动器/教学代码库，不是产品。它没有认证、授权、审计、租户隔离、限流、真实患者数据或真实资金处理。未经完整安全与合规评审，不要公开暴露，也不要用它处理生产临床/资金决策。

面向初学者的源码追踪阅读指南（Demo/Notes、MediatR、端口、SQLite store、共享 unit of work、模块注册与生成边界）见 [docs/architecture-guide.zh.md](docs/architecture-guide.zh.md)。

## 1. 支持版本与职责

| 组件 | 精确版本 / 职责 |
|---|---|
| .NET SDK | `10.0.403`；构建/运行全部 F# 项目 |
| ASP.NET Core / F# | ASP.NET Core `10.0.14`、F# 10；Host/API |
| MediatR | `12.5.0`（Apache-2.0）；Application CQRS 分发 |
| FsToolkit.ErrorHandling | `5.2.0`；`Task<Result<_, AppError>>` 管道 |
| Microsoft.Data.Sqlite | `10.0.14`；SQLite 驱动 |
| SqlHydra.Query / SqlHydra.Cli | `5.1.1` / `5.1.1`；类型化 SQL 与生成 schema 类型 |
| Microsoft.AspNetCore.OpenApi | `10.0.14`；OpenAPI 文档 |
| Node.js | 证据使用 `26.7.0`；根 `engines` 要求 `>=22` |
| pnpm | `10.30.3`；唯一包管理器与唯一根 lockfile |
| SvelteKit / adapter-node / Svelte | `2.50.2` / `5.5.2` / `5.49.2`；SSR 页面进程 |
| Vite / TypeScript / svelte-check | `7.3.1` / `5.9.3` / `4.3.6` |
| Tailwind CSS / bits-ui | `4.1.18` / `2.15.5`；样式与可访问原语 |
| shadcn-svelte / formsnap / sveltekit-superforms | `1.7.2` / `2.0.1` / `2.29.1`；官方组件与表单 |
| TanStack Query / Table / zod | `6.0.18` / `8.21.3` / `4.3.6` |
| @hey-api/openapi-ts | `0.93.1`；生成 TypeScript SDK |
| Vitest / Playwright | `3.2.4` / `1.56.1`；单测与浏览器测试 |
| sqlite3 CLI | 合成备份/恢复检查使用；证据环境为系统 SQLite 3.43.2 |

依赖只在根 `package.json`/`pnpm-lock.yaml` 声明；`web/` 不保留持久 `package.json`。仓库无 pnpm workspace、无 CI workflow。未来 CI 必须使用相同的根命令。

## 2. 模块架构与依赖规则

```text
src/Shared/Fsso.SharedKernel       AppError/ErrorKind、IUnitOfWork/IWorkScope、IFaultInjector
src/Shared/Fsso.Database           数据库路径/连接、迁移运行器、SqlHydra 生成类型、表句柄
src/Shared/Fsso.Api                共享 DTO、HTTP 结果映射、ModuleDescriptor、OpenAPI 基础
src/Modules/Demo/{Domain,Application,Infrastructure,Api}
src/Modules/Notes/{Domain,Application,Infrastructure,Api}
src/Composition/Fsso.Composition   SQLite work scope、共享 unit of work、迁移聚合、注册
src/Host                           启动、中间件、health/OpenAPI 挂载、仅 descriptor 挂载
tests/*                            原始套件、CQRS/启动套件、独立 Notes 套件
web/                               根包拥有的 SvelteKit + adapter-node + TypeScript + shadcn-svelte 前端
```

实际项目引用图：

```text
Fsso.SharedKernel          （无项目引用）

Fsso.Database              -> Fsso.SharedKernel
Fsso.Api                   -> Fsso.SharedKernel

Demo.Domain                （无项目引用）
Demo.Application           -> Demo.Domain, Fsso.SharedKernel
Demo.Infrastructure        -> Demo.Domain, Demo.Application, Fsso.SharedKernel, Fsso.Database
Demo.Api                   -> Demo.Domain, Demo.Application, Fsso.SharedKernel, Fsso.Api

Notes.Domain               （无项目引用）
Notes.Application          -> Notes.Domain, Fsso.SharedKernel
Notes.Infrastructure       -> Notes.Domain, Notes.Application, Fsso.SharedKernel, Fsso.Database
Notes.Api                  -> Notes.Domain, Notes.Application, Fsso.SharedKernel, Fsso.Api

Fsso.Composition           -> Demo.Application, Demo.Infrastructure,
                              Notes.Application, Notes.Infrastructure,
                              Fsso.SharedKernel, Fsso.Database
Fsso.Host                  -> Demo.Api, Notes.Api, Fsso.Composition, Fsso.Api, Fsso.SharedKernel
```

`Directory.Build.props` 设置 `<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>`，因此每个项目必须直接列出它使用的每个程序集。禁止边由 `.fsproj` 与源码共同检查：Domain 不引用任何项目；Application 不引用 Infrastructure/API/Host/Database 或其他模块；Infrastructure 不引用 API/Host 或其他模块；Api 不引用 Infrastructure/Host/Database 或其他模块；任何模块不引用 Host；Composition 不引用 Host。

`src/Host/Program.fs` 不包含 `/api/demos` 或 `/api/notes` 路由字面量，也不包含 Demo/Notes 的 DTO、handler、store 类型。它构建基础设施、解析固定显式 descriptor 列表，并调用每个 descriptor 的服务注册、OpenAPI 贡献与端点映射。每个模块暴露 `ModuleDescriptor`（`RegisterServices`、`ConfigureOpenApi`、`MapEndpoints`、`MigrationVersions`）。健康检查、OpenAPI、旧默认路径守卫和 JSON 404 回退属于基础设施端点。页面由 SvelteKit 进程提供。

四个 Demo 消息是 F# record，实现 `IRequest<Result<_, AppError>>`：`CreateDemoCommand`、`GetDemoQuery`、`ListDemosQuery`、`DeleteDemoCommand`。Notes 恰好两个：`CreateNoteCommand` 与 `GetNoteQuery`。具体 `IRequestHandler` 由各模块 descriptor 的 `AddMediatR` 程序集扫描注册。数据端点注入 `ISender` 并调用 `ISender.Send(message, ct)`。

## 3. 共享数据库、迁移与 unit of work

- 默认数据库：`data/fsso.db`，相对进程工作目录解析；父目录自动创建。
- 覆盖：`FSSO_DB_PATH=/absolute/path/to/fsso.db`。
- Schema 版本：各模块拥有的嵌入式 SQL 在启动时应用并记录到 `schema_migrations`；幂等且只向前。
  - Demo：`001_create_demos.sql`、`002_index_demos_created.sql`。
  - Notes：`003_create_notes.sql`（表 `notes` 与 `ix_notes_created_at_id`）。
- `src/Composition/Fsso.Composition/Composition.fs` 聚合 `DemoMigrations.all @ NotesMigrations.all`；`Fsso.Composition.migrate` 是唯一的产品启动与 `--migrate-only` 路径。`Fsso.Database.Migrations.apply` 不会自行扫描程序集。
- 连接事实：`PRAGMA foreign_keys=ON`、`PRAGMA busy_timeout=5000`、`Pooling=False`、SQLite 私有缓存。**未启用 WAL**；使用 SQLite 默认回滚日志。
- Schema 真相是迁移后的数据库 + `src/Shared/Fsso.Database/Generated/SqlHydra.fs`；不要手改生成查询类型。

跨模块共享 unit of work 位于 `src/Composition/Fsso.Composition`，在所有模块之外。`SqliteUnitOfWork.Run` 打开一个连接与事务，在同一连接/事务上构造各模块的 SQLite store，按接口注册到 `IWorkScope`，并调用工作回调：

- Ok 且至少一次写入：提交。
- 只读 Ok：回滚。
- Error、异常或取消：回滚；取消重新抛出 `OperationCanceledException`。
- store 通过共享 `markWrite` 记录写入；模块特有的唯一约束映射留在各 store。

`POST /api/notes` 使用该共享 unit of work。`GET /api/notes/{id}` 只读且不提交。Notes 事务测试还证明 Demo 写入与 Notes 写入可一起提交，且 Error、异常、取消会同时回滚两者。

## 4. Demo 模块（HTTP 契约不变）

Demo 保持路径、状态码、载荷、operation ID 与数据库 schema 不变：

- `POST /api/demos` -> 201 `DemoResponse`，带 `Location`
- `GET /api/demos?page=&limit=` -> 200 `PagedDemoResponse`
- `GET /api/demos/{id}` -> 200；坏 id 400；缺失 404
- `DELETE /api/demos/{id}` -> 204；坏 id 400；缺失 404

Demo 的 domain、application、infrastructure、api 文件拆分在 `src/Modules/Demo`；`DemoEndpoints.fs` 与 `DemoModule.fs` 分离。Demo 的 OpenAPI 子集冻结于基线 `08b7116`；完整文档只新增 Notes 操作。

## 5. Notes 示例模块（刻意很小且不完整）

Notes 是合成示例模块，独立于 Demo。它用于展示如何在不修改 Demo 源码的情况下横向增加第二个模块。

- Domain：`NoteId`（UUIDv7 字符串）、`Note { Id; Title; Body: string option; CreatedAt }`，标题 trim 后 1-120 字符，正文 trim 后最多 4000，空正文变为 `None`。
- Application 端口：`INoteStore`，含 `FindById` 与 `Insert`；没有 delete 端口。
- 每个消息和每个 handler 一个文件：`CreateNoteCommand.fs`、`GetNoteQuery.fs`、`CreateNoteHandler.fs`、`GetNoteHandler.fs`。
- Infrastructure：`SqliteNoteStore.fs`、`NotesMigrations.fs`、嵌入式 `Migrations/003_create_notes.sql`。
- API：`NoteDtos.fs`、`NoteEndpoints.fs`、`NotesModule.fs`。

端点与契约：

| 方法 | 路径 | 成功 | 错误 |
|---|---|---|---|
| `POST` | `/api/notes` | 201 `NoteResponse`，`Location: /api/notes/{id}` | 400 校验、500 |
| `GET` | `/api/notes/{id}` | 200 `NoteResponse` | 400 坏 id、404 缺失、500 |

operation ID 为 `createNote` 与 `getNote`，tag 为 `Notes`。`NoteResponse` 为 `{ id, title, body, createdAt }`。

**按设计未实现：** 没有 note 列表、没有 note 删除、没有 Tags 产品、没有 Notes 前端 UI、没有 Notes 浏览器旅程。Notes 证据是后端 HTTP/SQLite 与独立后端测试套件。

## 6. 安装、开发、构建与测试

所有命令都在仓库根目录运行：

```bash
npx --yes pnpm@10.30.3 install --frozen-lockfile
npx --yes pnpm@10.30.3 dev
npx --yes pnpm@10.30.3 check
npx --yes pnpm@10.30.3 test
npx --yes pnpm@10.30.3 build
npx --yes pnpm@10.30.3 gen:openapi
npx --yes pnpm@10.30.3 gen:sdk
bash scripts/gen-sqlhydra.sh
node scripts/sqlite-backup-check.mjs
node scripts/release-smoke.mjs
npx --yes pnpm@10.30.3 package:source
```

- `dev`：F# Host `127.0.0.1:5080`（`FSSO_DEV_API_PORT`）+ SvelteKit `127.0.0.1:5173`（`FSSO_DEV_WEB_PORT`）。Vite 把 `/api` 与 `/openapi` 代理到 `FSSO_API_ORIGIN`。
- `check`：brand、structure、MediatR/许可证、OpenAPI/SDK 契约、可执行架构检查、Demo 契约、`dotnet build -warnaserror`、`svelte-check`。
- `test`：构建/发布、负向对照、全部原始 .NET 测试项目及精确保留检查、CQRS/启动测试、独立 Notes 套件、合成 SQLite 备份/恢复、前端检查、5 个单测、5 个 Playwright Demo 旅程（打发布后的 SvelteKit 源）。它还会冒烟发布的 Notes create/get 端点。
- `build`：SvelteKit 构建到 `web/build/index.js`，再 `dotnet publish` 到 `artifacts/publish/Fsso.Host.dll`。构建期间会写入临时 `web/package.json` 供 adapter-node 读取根依赖，结束后删除。Host 发布目录不包含页面。
- `dotnet artifacts/publish/Fsso.Host.dll --migrate-only`：只应用迁移、不启动 HTTP；使用同一 fail-closed DB 守卫。
- `release:smoke`：发布后的 API 与 SvelteKit Node 进程；代理健康检查、JSON 404、Demo 与 Notes 创建/读取、重启持久化，以及 Demo 删除。
- `package:source`：从已提交 `HEAD` 创建 `artifacts/fsso-modular-source-v2.tar.gz`（可用 `FSSO_ARCHIVE_PATH=<path>` 覆盖），再解压到新的唯一 `independent-<sourceSha>-<timestamp>-<pid>` 目录。若归档或解压路径已存在则拒绝覆盖；执行 frozen install、`pnpm check`、`pnpm test`、build/publish、备份/恢复、Demo 浏览器 5、双进程页面/API 检查、独立 host 经 SvelteKit 代理的 Demo create/list/get（API 重启后再 get，不含 delete/update）、Notes create/get、重启持久化、报告占位符/状态门禁与零旧品牌词审计。完整 `pnpm test` 与 release smoke 会执行 Demo delete；独立 host 不执行。绝不删除既有归档、解压目录或证据。

环境变量：

| 变量 | 默认值 | 用途 |
|---|---|---|
| `FSSO_DB_PATH` | `data/fsso.db` | SQLite 路径；相对工作目录，或绝对路径 |
| `ASPNETCORE_URLS` | ASP.NET 默认；dev 为 `http://127.0.0.1:5080` | 监听地址 |
| `ASPNETCORE_ENVIRONMENT` | 发布运行默认 `Production` | `Development` 用于开发 Host；页面仍由 SvelteKit 提供 |
| `FSSO_FAULT_INJECTION` | 关闭 | 仅测试用 `X-Test-Fault`；生产绝不启用 |
| `FSSO_API_ORIGIN` | `http://127.0.0.1:5080` | Vite 开发代理与 SvelteKit 生产代理使用的 API 源 |
| `FSSO_DEV_API_PORT` / `FSSO_DEV_WEB_PORT` | `5080` / `5173` | 开发监听端口 |
| `HOST` / `PORT` / `ORIGIN` | adapter-node 默认 | 生产 SvelteKit 监听地址。将 `HOST` 设为 `127.0.0.1`，并指定 `PORT` |
| `VITE_API_BASE_URL` | 空（同源） | 可选绝对 API 基址。为空时浏览器请求 SvelteKit 源 |
| `BASE_URL` | `http://127.0.0.1:5173` | Playwright 目标；测试改为发布后的 SvelteKit 地址 |
| `FSSO_TEST_PORT`、`FSSO_RELEASE_PORT`、`FSSO_PACKAGE_PORT` | `0`（自动） | 测试/冒烟/打包可选固定端口 |
| `FSSO_SCRATCH` | `artifacts/independence` | 源码包独立解压根目录 |

不需要任何凭证，也不读取凭证文件。

## 7. 测试与证据

测试编排保留原始测试身份，而不只是总数：

- 原始后端测试：**31** —— Domain 5、Application 6、Integration 20。`tests/original-test-names.json` 冻结每个名称；`scripts/test.mjs` 分项目运行并精确比较名称。
- 专用 CQRS/启动测试：**13** —— 处理器选择、缺失注册、400/404/409 映射、Error/异常/取消回滚、并发唯一创建、同 id 并发删除，以及 fail-closed 默认路径/启动测试（含 `--migrate-only`）。
- Notes 后端测试：**8** —— create/get HTTP 与直接 SQLite 行、校验与缺失/坏 id、迁移/版本/表、重启持久化、跨模块提交/Error/异常/取消。
- 前端单测：**5**。
- Playwright Demo 旅程：**5**，打发布后的进程。
- 合成备份/恢复：真实 HTTP 创建 -> 停止 -> `sqlite3 .backup` -> `.restore` -> 恢复路径启动 -> 读取。
- `scripts/negative-control.mjs` 证明被杀/失败子进程不会被误报为 RC 0。
- `node scripts/brand-check.mjs` 对跟踪路径与字节做大小写不敏感/二进制安全扫描；`node scripts/structure-check.mjs` 校验包、解决方案、模块布局、程序集、环境变量、默认 DB、OpenAPI、UI、归档名，以及无 workspace/嵌套包消费者。
- `node scripts/architecture-check.mjs` 校验真实项目图、模块源码边界、Host descriptor、迁移版本、Demo manifest 与合成禁止 fixture。
- 精确命令、RC、计数、哈希与已知偏差记录在 `docs/reviews/`。历史 pre-FSSO 文档明确标记 `HISTORICAL (pre-FSSO)`；旧证据属于历史标签，不属于活动代码。

## 8. OpenAPI、SDK、SqlHydra 与 shadcn 生成

```bash
npx --yes pnpm@10.30.3 gen:openapi   # 运行中的 Host -> openapi/openapi.json
npx --yes pnpm@10.30.3 gen:sdk       # openapi/openapi.json -> web/src/lib/api/generated
bash scripts/gen-sqlhydra.sh         # 迁移后的全模块 schema -> 生成 SqlHydra 类型
npx --yes pnpm@10.30.3 shadcn:add skeleton
```

- `gen:openapi` 导出真实运行 API，期望恰好 7 个 operation ID：`createDemo`、`listDemos`、`getDemo`、`deleteDemo`、`health`、`createNote`、`getNote`。
- `gen:sdk` 使用 @hey-api/openapi-ts，并要求 Demo 与 Notes 操作/类型。生成文件经审核后提交；不要手改。
- `gen:sqlhydra.sh` 通过 `Host --migrate-only` 迁移 schema DB（同时应用 Demo 与 Notes 迁移），再运行 SqlHydra 到 `src/Shared/Fsso.Database/Generated/SqlHydra.fs`。
- `shadcn:add` 通过 `scripts/shadcn-add.mjs` 调用官方 `shadcn-svelte add <args> --cwd web --no-deps-install -y`。Wrapper 临时提供 `web/package.json`，在 `finally` 删除；若已存在 `web/package.json` 则拒绝并逐字节保留。
- `--no-deps-install` 不会更新根依赖。组件若需要新依赖，必须显式更新根 `package.json` 与 `pnpm-lock.yaml`。

## 9. 新增模块

以 Notes 为最小模板、Demo 为完整 CRUD 模板。横向增加模块，不要修改其他模块源码。

1. **Domain 项目：** 新增 `src/Modules/<Name>/Domain/Fsso.Modules.<Name>.Domain.fsproj` 与实体/校验文件。Domain 无项目引用。
2. **Application 项目：** 新增 `.../Application/Fsso.Modules.<Name>.Application.fsproj`，含 `FsToolkit.ErrorHandling 5.2.0` 与恰好一个 `MediatR 12.5.0` 包引用。增加 `Ports.fs`，并在 `Commands/`、`Queries/`、`Handlers/` 下每个命令/查询、每个 handler 一个文件；只引用 Domain + SharedKernel。
3. **Infrastructure 项目：** 新增 `.../Infrastructure/Fsso.Modules.<Name>.Infrastructure.fsproj`、`Infrastructure/Migrations/` 下新的只向前迁移、`*Migrations.fs` 嵌入式资源读取器与 SQLite store。引用 Domain/Application + SharedKernel + Database。绝不修改已应用迁移。
4. **Api 项目：** 新增 `.../Api/Fsso.Modules.<Name>.Api.fsproj`，含 ASP.NET framework reference、`Microsoft.AspNetCore.OpenApi 10.0.14`、`MediatR 12.5.0`。增加 DTO、端点与 `<Name>Module.fs` descriptor。端点调用 `ISender.Send`；写入走共享 unit of work。
5. **共享组合点：** 只把新模块的 Application 与 Infrastructure 两个 `.fsproj` 引用加入 `src/Composition/Fsso.Composition/Fsso.Composition.fsproj`；在 `Composition.fs` 聚合新迁移；在 `SqliteUnitOfWork.fs` 的 `StoreKeys`/`StoreFactory` 中注册新 store 接口与工厂，并把实例加入 `stores` 字典；store 构造保持在共享事务内。`SqliteWorkScope` 是通用作用域，不需要按模块修改。若需要新 schema 句柄，更新 `src/Shared/Fsso.Database/Tables.fs` 并重新生成 `Generated/SqlHydra.fs`。
6. **Host：** 先在 `src/Host/Fsso.Host.fsproj` 添加对新模块 Api 项目的 `ProjectReference`，再在 `src/Host/Program.fs` 固定 descriptor 列表中加入 `<Name>Module.descriptor`。不要加路由字面量或 DTO/handler/store 类型。
7. **解决方案：** 把产品项目与任何新测试项目加入 `FssoStack.slnx`。
8. **脚本与生成点：** 更新 `scripts/architecture-check.mjs` 期望边/禁止 open（只有 Demo/test manifest 策略变化时才改 manifest）、`scripts/structure-check.mjs` 项目/必需文件列表、`scripts/check-mediatr.mjs` 模块列表、`scripts/gen-openapi.mjs` 期望 operation ID、`scripts/gen-sdk.mjs` 必需操作/类型、`scripts/test.mjs` 套件编排、`scripts/package-source.mjs` 必需文件。运行 `bash scripts/gen-sqlhydra.sh`、`gen:openapi`、`gen:sdk`；只通过生成器刷新 `scripts/contract-hashes.json`。
9. **测试：** 新增专用测试项目，保留原始套件身份。按模块需要增加 HTTP/SQLite 往返、校验、重启与事务回滚用例。除非任务明确要求，不要增加前端 UI 或浏览器旅程。

## 10. 安全的默认路径迁移、fail-closed 启动、备份与恢复

旧 pre-FSSO 启动器在 `data/` 使用过不同的默认数据库文件名。FSSO Stack 默认路径启动与 `--migrate-only` 现在都 fail closed：

- 若 `FSSO_DB_PATH` 未设置/为空白，且 `data/` 下存在旧 pre-FSSO 默认文件，正常启动 **和** `--migrate-only` 都会在打开或创建任何数据库之前失败。
- 错误会指出旧路径，并要求运维设置 `FSSO_DB_PATH` 并恢复/选择显式数据库。
- 旧文件仅通过文件系统元数据检查；绝不打开、修改、移动或删除。
- 显式设置 `FSSO_DB_PATH` 时，即使旧文件仍在，也允许在该路径启动/执行 `--migrate-only`。没有自动发现、自动迁移或静默替换。
- 若不存在旧默认文件，正常创建并迁移 `data/fsso.db`。

运维恢复（停止应用或控制写入）：

```bash
sqlite3 "/path/to/legacy-pre-fsso.db" ".backup '/secure/legacy-backup.db'"
sqlite3 "/secure/restored-fsso.db" ".restore '/secure/legacy-backup.db'"
sqlite3 "/secure/restored-fsso.db" "PRAGMA integrity_check;"
FSSO_DB_PATH="/secure/restored-fsso.db" \
ASPNETCORE_URLS="http://127.0.0.1:5099" \
ASPNETCORE_ENVIRONMENT="Production" \
dotnet artifacts/publish/Fsso.Host.dll
```

日常一致备份/恢复使用 SQLite CLI 的备份 API，应用停止或写入受控：

```bash
sqlite3 "$DB" ".backup '/secure/backup.db'"
sqlite3 "/secure/restored.db" ".restore '/secure/backup.db'"
sqlite3 "/secure/restored.db" "PRAGMA integrity_check;"
```

`node scripts/sqlite-backup-check.mjs` 在合成 Demo 数据上端到端验证：真实 HTTP 创建 -> 停止应用 -> `.backup` -> `.restore` 到新路径 -> 在恢复路径启动 -> GET/列表读取该行。绝不接触真实数据库。

## 11. 生产构建、运行、升级与回滚

```bash
npx --yes pnpm@10.30.3 build
FSSO_DB_PATH="/srv/fsso/data/fsso.db" \
ASPNETCORE_URLS="http://127.0.0.1:5099" \
ASPNETCORE_ENVIRONMENT="Production" \
dotnet artifacts/publish/Fsso.Host.dll
```

生产形态是两个进程。`dotnet artifacts/publish/Fsso.Host.dll` 提供 `/api` 与 OpenAPI。`node web/build/index.js` 提供 SvelteKit 页面，并把 `/api` 与 `/openapi` 代理到 `FSSO_API_ORIGIN`。Node 不打开 SQLite。未知 `/api/*` 返回 JSON 错误。不要让多个 API 实例指向同一 SQLite 文件：SQLite 锁 + busy timeout 保护单个写入者，不是多实例部署方案。WAL 与水平扩展只是建议，未实现。

升级：

1. 停止应用。
2. 做并验证一致备份。
3. 部署新构建。
4. 启动；只向前迁移在启动时应用。
5. 验证健康、读取/列表与完整性。

回滚：

- 迁移只向前，没有自动 down migration。
- 若 schema 变更，重新部署旧构建 **并** 恢复匹配备份。
- 若 schema 未变，重新部署旧构建通常足够。

## 12. 安全与部署建议

当前已实现：便于 loopback 的 Kestrel 托管、参数化 SqlHydra/SQLite 访问、错误响应不泄露内部异常文本、仅当 `FSSO_FAULT_INJECTION` 开启时启用测试故障注入、仓库无凭证。

真实部署建议（未实现）：

- 反向代理终止 TLS；应用只绑定 loopback/私网。
- 配置代理超时、请求体大小限制与限流。
- 以非 root 用户运行；数据目录 `0700`，数据库/备份文件 `0600`；备份静态加密。
- 增加认证、授权、适用场景的 CSRF 防护、审计日志、监控与告警。
- 使用托管备份计划并定期演练恢复。
- 不要公开暴露；不要存储真实患者或真实资金数据。

本启动器 **没有认证或审计**。`/api` 按 demo 设计未认证。

## 13. 故障排查

- **启动：旧 pre-FSSO 默认数据库错误。** 将 `FSSO_DB_PATH` 设为显式恢复/全新路径。不要盲目删除或移动旧文件；先做并验证备份。
- **`database is locked`。** 停止额外的 API 写入者。同一 SQLite 文件只应由一个 Host 进程打开。检查数据目录权限与 5 秒 busy timeout。
- **生产页面 404。** 运行 `pnpm build`，启动 Host，再以指向该 Host 的 `FSSO_API_ORIGIN` 启动 `node web/build/index.js`。Host 本身不提供页面。
- **迁移看起来过期。** 重启应用或执行迁移路径；不要编辑已应用 SQL，新增编号迁移。
- **SqlHydra 类型缺少表。** 先迁移 schema DB，再运行 `bash scripts/gen-sqlhydra.sh`。脚本走 Host migrate-only，因此两个模块都在。
- **打包拒绝启动。** 目标归档（默认 `artifacts/fsso-modular-source-v2.tar.gz`）或解压目录已存在。保留旧证据并用 `FSSO_ARCHIVE_PATH` 选择新的版本化路径；不会自动删除。
- **shadcn 生成被拒绝。** `web/package.json` 已存在；检查后有意删除。Wrapper 不会覆盖既有 manifest。

## 14. 许可证与 MediatR 12.5.0 状态

仓库目前没有顶层 `LICENSE` 文件；再分发前应补充明确的项目许可证。第三方组件遵循各自上游许可证；分发前请按组织政策复核。

| 依赖 | 许可证 |
|---|---|
| MediatR `12.5.0` | Apache-2.0 |
| FsToolkit.ErrorHandling `5.2.0` | MIT |
| Microsoft.Data.Sqlite `10.0.14`、Microsoft.AspNetCore.OpenApi `10.0.14` | MIT |
| SqlHydra.Query/Cli `5.1.1` | MIT |
| SvelteKit `2.50.2`、adapter-node `5.5.2`、Svelte `5.49.2`、Vite `7.3.1`、bits-ui `2.15.5`、Tailwind CSS `4.1.18`、shadcn-svelte `1.7.2`、formsnap `2.0.1`、sveltekit-superforms `2.29.1`、@hey-api/openapi-ts `0.93.1`、Vitest `3.2.4`、svelte-check `4.3.6`、tailwind-variants `3.2.2`、clsx `2.1.1`、tailwind-merge `3.4.0`、zod `4.3.6` | MIT |
| TypeScript `5.9.3` | Apache-2.0 |
| Playwright / @playwright/test `1.56.1` | Apache-2.0 |

**MediatR 12.5.0：** 有意固定在 Apache-2.0 的 `12.5.0` 线。该旧版本线**不再接收上游更新或安全支持**。MediatR 13+ 已转向 RPL/商业授权；本项目不使用 13+、不注册付费许可证、不包含许可证密钥或注册代码。此说明是事实陈述，不构成支持或背书。

## 15. 已实现 vs 建议

**已实现：** 模块化 shared kernel/database/API、Demo 与 Notes 模块、跨模块共享 SQLite unit of work、编译期模块边界与可执行架构检查；真实 SQLite + 只向前迁移；FK 开启、busy timeout 5000、私有缓存、无 WAL；旧默认路径 fail-closed 启动；显式路径恢复；合成备份/恢复验证；双进程生产托管（API 与 SvelteKit adapter-node）；生成 OpenAPI/SDK/SqlHydra 类型；shadcn 组件生成；原始测试身份保留与独立 CQRS/启动、Notes 测试计数。

**建议但未实现：** WAL/多实例部署、认证/授权、审计日志、CSRF/限流、托管备份/监控、TLS 终止、反向代理加固、CI、Notes 列表/删除/Tags/UI。这些是运维或未来任务责任。

## 16. 品牌与历史

`brand-check` 对跟踪路径与文件字节做大小写不敏感、二进制安全的旧品牌词检查；`structure-check` 校验单包/解决方案/模块/DB/UI/归档契约。历史 pre-FSSO 文档保留记录结果，但明确标记 `HISTORICAL (pre-FSSO)` 并已中性化。不会自动发现或静默替换旧数据库文件名。
