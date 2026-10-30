# FSSO Stack 架构阅读指南（中文）

本文面向第一次阅读本仓库的开发者，按真实源码追踪一次请求从 HTTP 进入、经过应用层与端口、落到 SQLite，再由共享工作单元决定提交或回滚的全过程。文中出现的类型、函数和文件路径都来自当前仓库的 `src/`、`tests/`、`scripts/`、`web/`、`README` 与 `artifacts` 等真实文件，不是抽象示意图。

> **范围声明：** Demo 与 Notes 都是启动器示例，用于演示 F# + ASP.NET Core + SQLite + MediatR + OpenAPI + Svelte 的装配方式。它们不构成临床、医疗、金融或资金处理产品，也不包含认证、授权、审计、租户隔离或真实患者/资金数据。请勿据此声称支持临床或金融业务；任何真实部署都需要独立的安全、合规与领域评审。

## 1. 先建立整体心智模型

可以把一次请求分成五段：

1. **Api 层绑定 HTTP**：`src/Modules/<Module>/Api/*Endpoints.fs` 把路由、请求体、路径参数和查询参数转成 MediatR 消息。
2. **Application 层执行用例**：`src/Modules/<Module>/Application/Handlers/*Handler.fs` 做领域校验、调用端口，并决定成功或 `AppError`。
3. **端口隔离持久化**：`src/Modules/<Module>/Application/Ports.fs` 只声明 `IDemoStore` 或 `INoteStore` 的异步方法，不暴露 SQLite。
4. **Infrastructure 层实现端口**：`src/Modules/<Module>/Infrastructure/Sqlite*Store.fs` 用 SqlHydra 查询和当前事务写入，并通过 `markWrite` 通知工作单元。
5. **Composition 层统一事务**：`src/Composition/Fsso.Composition/SqliteUnitOfWork.fs` 为一次请求打开一个连接和一个事务，让 Demo 与 Notes 共享提交/回滚。

Host 只负责启动和装配，不包含模块路由字面量。每个模块通过 `ModuleDescriptor` 向 Host 描述自己如何注册服务、贡献 OpenAPI、映射端点和声明迁移版本。

```text
HTTP
  -> Api Endpoints (ISender.Send)
  -> MediatR IRequestHandler
  -> IUnitOfWork.Run (SqliteUnitOfWork opens single connection + transaction)
       -> callback receives IWorkScope
       -> scope.Store<IDemoStore / INoteStore>() resolves the port
       -> Sqlite Store (QueryContext + SqliteTransaction + markWrite)
  -> SqliteUnitOfWork attempts commit or rollback after the callback returns, per implementation rules
```

## 2. Demo 写路径：创建、列表、详情、删除

### 2.1 创建 Demo：POST /api/demos

入口在 `src/Modules/Demo/Api/DemoEndpoints.fs` 的 `DemoEndpoints.map`。`MapPost("/api/demos", ...)` 接收 `CreateDemoRequest`，构造 `CreateDemoCommand`，然后调用 `ISender.Send(command, ct)`。

- 请求 DTO `CreateDemoRequest` 定义在 `src/Modules/Demo/Api/DemoDtos.fs`，只有 `Name` 和可空 `Description`。
- `DemoDtos.toDescription` 把 JSON `null` 转成 F# `None`。
- 命令 `CreateDemoCommand` 在 `src/Modules/Demo/Application/Commands/CreateDemoCommand.fs`，实现 `IRequest<Result<Demo, AppError>>`。
- MediatR 在 `DemoModule.descriptor.RegisterServices` 中通过 `services.AddMediatR(... RegisterServicesFromAssembly(typeof<CreateDemoCommand>.Assembly))` 扫描 Application 程序集，找到 `CreateDemoHandler`。
- `CreateDemoHandler.Handle` 位于 `src/Modules/Demo/Application/Handlers/CreateDemoHandler.fs`。它先调用 `Demo.create command.Name command.Description`，把领域 `ValidationError` 通过 `CreateDemo.mapValidation` 转成 `AppError.validation`。校验失败时不会开启工作单元，也不会接触数据库。
- 校验通过后，handler 调用 `uow.Run`。`uow` 是 `IUnitOfWork`，运行期由 `SqliteUnitOfWork` 实现。
- 在 `uow.Run` 的 lambda 内，`scope.Store<IDemoStore>()` 从当前事务作用域取出 `SqliteDemoStore`，再调用 `store.Insert(demo, token)`。
- `SqliteDemoStore.Insert`（`src/Modules/Demo/Infrastructure/SqliteDemoStore.fs`）用 SqlHydra `insert { into Tables.Demo; entity ... }` 写入 `main.demos`。成功时调用 `markWrite ()`；SQLite 约束错误码 19（通用约束）或 2067（唯一约束扩展）都映射为 `AppError.conflict`。
- 随后调用 `fault.AfterWrite token`。生产默认是 `HttpFaultInjector`，只有 `FSSO_FAULT_INJECTION=1` 且请求头 `X-Test-Fault` 匹配时才制造错误、异常或延迟；用于测试提交前回滚。
- handler 返回新建的 `Demo`。端点用 `DemoDtos.demoResponse` 转成 `DemoResponse`，返回 `Results.Created("/api/demos/{id}", response)`，即 201 + `Location`。

对应的领域规则在 `src/Modules/Demo/Domain/Demo.fs`：名称 trim 后不能为空且最多 100 字符，描述 trim 后最多 500 字符，空描述变为 `None`；`DemoId.newId` 使用 `Guid.CreateVersion7()`。

### 2.2 列表 Demo：GET /api/demos?page=&limit=

`DemoEndpoints.tryQueryInt` 负责解析查询参数：

- 参数缺失返回 `Ok None`，端点使用默认 `page=1`、`limit=10`。
- 参数重复返回 `AppError.validation`。
- 参数不是整数返回 `AppError.validation`。

端点构造 `ListDemosQuery` 并 `ISender.Send`。`ListDemosHandler.Handle`（`src/Modules/Demo/Application/Handlers/ListDemosHandler.fs`）先检查：

- `Page < 1`；
- `Limit < 1 || Limit > 100`；
- `int64 Page * int64 Limit > Int32.MaxValue`。

任一不满足直接返回 `AppError.validation`，不会进入存储。合法后调用 `IDemoStore.List`。

`SqliteDemoStore.List` 使用 SqlHydra 查询：

```fsharp
orderByDescending demo.created_at
thenByDescending demo.id
skip offset
take limit
```

然后用绑定当前 `transaction` 的独立计数命令 `SELECT COUNT(*) FROM demos;` 得到总数，返回 `PagedDemos`。端点再通过 `DemoDtos.pagedDemoResponse` 输出 `PagedDemoResponse`，字段为 `data/page/limit/total`，其中 `total` 是 `int64`。

### 2.3 详情 Demo：GET /api/demos/{id}

端点先用 `DemoId.tryParse` 解析路径参数。解析失败直接 `HttpResults.jsonError` 返回 400 `validation`；成功则构造 `GetDemoQuery` 并发送。

`GetDemoHandler.Handle`（`src/Modules/Demo/Application/Handlers/GetDemoHandler.fs`）在 `uow.Run` 内调用 `IDemoStore.FindById`：

- 命中返回 `Demo`；
- 未命中返回 `AppError.notFound "Demo not found."`。

这是只读路径：`FindById` 不调用 `markWrite`。在当前 `SqliteUnitOfWork` 实现中，即使工作单元返回 `Ok`，由于 `writeCount` 为 0，也会尝试回滚空事务，不会产生写提交；该行为属于实现语义，不是 `IUnitOfWork` 接口契约。

### 2.4 删除 Demo：DELETE /api/demos/{id}

端点同样先 `DemoId.tryParse`。`DeleteDemoCommand` 只携带 `DemoId`，实现 `IRequest<Result<unit, AppError>>`。

`DeleteDemoHandler.Handle`（`src/Modules/Demo/Application/Handlers/DeleteDemoHandler.fs`）在同一个 `uow.Run` 作用域内：

1. `store.FindById` 确认存在；
2. 不存在返回 `AppError.notFound`；
3. 存在则 `store.Delete`，再 `fault.AfterWrite`。

`SqliteDemoStore.Delete` 使用 SqlHydra `delete { for demo in Tables.Demo; where (demo.id = ...) }`，成功后调用 `markWrite ()`。端点收到 `Ok ()` 后返回 204。

## 3. Notes 路径：创建与获取

Notes 是刻意做小的第二模块，用来展示“横向增加模块而不修改 Demo”的做法。

### 3.1 创建 Note：POST /api/notes

`src/Modules/Notes/Api/NoteEndpoints.fs` 的 `NoteEndpoints.map` 绑定 `CreateNoteRequest`，构造 `CreateNoteCommand`，通过 `ISender.Send` 分派。

- `CreateNoteRequest` / `NoteResponse` 在 `src/Modules/Notes/Api/NoteDtos.fs`。
- 命令在 `src/Modules/Notes/Application/Commands/CreateNoteCommand.fs`。
- `NotesModule.descriptor` 用 `AddMediatR` 扫描 `Fsso.Notes.Application` 程序集。
- `CreateNoteHandler.Handle`（`src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs`）先调用 `Note.create`，把 `ValidationError` 转成 `AppError.validation`，再在 `uow.Run` 中取得 `INoteStore` 并调用 `Insert`。
- `SqliteNoteStore.Insert`（`src/Modules/Notes/Infrastructure/SqliteNoteStore.fs`）写入 `main.notes`，成功后 `markWrite ()`，返回插入时使用的内存 `Note` 对象而不是数据库回读。
- 端点返回 201 与 `Location: /api/notes/{id}`。

领域规则在 `src/Modules/Notes/Domain/Note.fs`：标题 trim 后 1–120 字符，正文 trim 后最多 4000 字符，空正文变 `None`；`NoteId.newId` 同样使用 `Guid.CreateVersion7()`。

### 3.2 获取 Note：GET /api/notes/{id}

`NoteEndpoints.map` 用 `NoteId.tryParse` 解析路径。失败返回 400；成功构造 `GetNoteQuery`。`GetNoteHandler.Handle`（`src/Modules/Notes/Application/Handlers/GetNoteHandler.fs`）在 `uow.Run` 内调用 `INoteStore.FindById`：

- 命中返回 `Note`；
- 未命中返回 `AppError.notFound "Note not found."`。

Notes 没有列表、删除、Tags 或前端 UI；这些不是遗漏，而是模块边界示例的刻意范围。

## 4. 跨模块原子事务：一个连接、一个事务、一个写入计数

核心文件是 `src/Composition/Fsso.Composition/SqliteUnitOfWork.fs`。

### 4.1 Run 的装配顺序

`SqliteUnitOfWork.Run` 每次调用执行以下步骤：

1. `QueryContextFactory.Create(Db.connectionString dbPath)` 创建查询上下文。
2. `factory.OpenContextAsync()` 打开连接。
3. 执行 `PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`。
4. `context.Connection.BeginTransaction()` 开启事务，并设置 `context.Transaction`，确保查询和写入使用同一连接。
5. 创建 `writeCount` 与 `markWrite () = writeCount <- writeCount + 1`。
6. 通过 `StoreFactory.demo` 与 `StoreFactory.note` 构造两个 store，二者都绑定同一个 `QueryContext`、同一个 `SqliteTransaction`、同一个 `markWrite`。
7. 把两个 store 放入 `Dictionary<Type, obj>`，包装成 `SqliteWorkScope`，再执行传入的 `work`。

`StoreFactory` 用反射按程序集名和类型名找到 `Fsso.Infrastructure.DemoStoreRegistration` 与 `Fsso.Notes.Infrastructure.NoteStoreRegistration`，调用它们的 `create` 方法。`StoreFactory.validate()` 在 `Composition.registerInfrastructure` 中启动期执行，任何 store 注册缺失都会让应用启动失败，而不是运行期悄悄回退。

`SqliteWorkScope.Store<'T>()` 只用 `typeof<'T>` 精确查字典；缺失注册立即抛出 `failwithf`，不会返回默认值或借用其他事务的实例。

### 4.2 提交与回滚判定

进入 `try` 的 `work` 返回后，`Run` 按以下规则处理：

| 条件 | 行为 |
|---|---|
| `Ok _` 且 `writeCount > 0` | `transaction.CommitAsync(ct)` |
| `Ok _` 且 `writeCount = 0` | `transaction.RollbackAsync(ct)`（只读不提交） |
| `Error _` | `transaction.RollbackAsync(ct)` |
| `OperationCanceledException` | 进入 catch 后用 `CancellationToken.None` 回滚；该次回滚成功则通过 `ExceptionDispatchInfo` 原样重抛取消异常，失败则传播该次回滚异常 |
| 其他异常 | 进入 catch 后用 `CancellationToken.None` 回滚；该次回滚成功则返回 `Error(AppError.unexpected ex)`，失败则传播该次回滚异常 |

如果 `OpenContextAsync`、PRAGMA 或 `BeginTransaction` 在 `try` 之前失败，异常会直接向外传播，不会进入上述判定。正常路径上 `Ok` 零写入或 `Error` 的第一次回滚失败时，异常会进入对应 catch 分支并以 `CancellationToken.None` 再次回滚。非取消路径上，只有 catch 分支的这次回滚失败时直接传播回滚异常；取消路径上，catch 分支回滚成功时重抛原 `OperationCanceledException`，回滚失败时传播该次回滚异常。

因此在同一请求内，Demo 的 `markWrite` 和 Notes 的 `markWrite` 累加到同一个计数。只要两者都成功，整个事务一次提交；在 `try` 内任一 handler 返回 `Error`、抛出异常或取消，会尝试回滚两个模块的写入。只读请求虽然返回 `Ok`，但零写入会尝试回滚空事务。上述提交/回滚与零写入回滚均是当前 `SqliteUnitOfWork` 的实现语义，不是 `IUnitOfWork` 接口保证；`try` 前的连接/PRAGMA/事务开启失败不会走这套判定，正常路径第一次回滚失败会进入 catch 分支再次回滚；非取消路径只在 catch 分支回滚失败时传播该次回滚异常，取消路径在 catch 分支回滚成功时重抛原取消异常、失败时传播该次回滚异常。

### 4.3 异常与 HTTP 的边界

- 非取消的 `Error(AppError...)` 结果本身不会以异常形式向上抛；正常路径第一次回滚失败会进入 catch 分支，重试成功时可能改为返回 `AppError.unexpected`，再由端点通过 `HttpResults.toHttpResult` 映射；非取消路径只有 catch 分支回滚失败时传播该次回滚异常。取消路径不返回 `Error`：catch 分支回滚成功时重抛原 `OperationCanceledException`，回滚失败时传播该次回滚异常。
- `try` 内捕获的非取消异常（包括正常路径第一次回滚失败）在 catch 分支回滚成功时被包成 `AppError.unexpected`，`AppError.Cause` 只保留给内部，`HttpResults` 输出的是固定 `ErrorResponse`，不把异常文本或类型写进响应体；`try` 前失败会直接传播，非取消路径的 catch 分支回滚失败会传播该次回滚异常。
- 取消路径不返回 `Error`：catch 分支回滚成功后继续向上传播原取消异常，Host 中间件遇到 `OperationCanceledException` 时重新抛出与 `RequestAborted` 关联的取消，不把取消误报成 500；catch 分支回滚失败时传播该次回滚异常。
- Host 中间件另外把 `BadHttpRequestException` 与格式错误响应统一成 400 `ErrorResponse`；未知 `/api/*` 由 JSON 404 回退处理，绝不回退到 SPA 的 `index.html`。

`src/Shared/Fsso.SharedKernel/Errors.fs` 定义 `ErrorKind` 与 `AppError`；`src/Shared/Fsso.Api/HttpResults.fs` 负责状态码映射和 `traceId`。

## 5. 模块注册与编译顺序

### 5.1 描述符

`src/Shared/Fsso.Api/ModuleDescriptor.fs` 定义：

```fsharp
type ModuleDescriptor =
    { Name: string
      RegisterServices: IServiceCollection -> unit
      ConfigureOpenApi: IServiceCollection -> unit
      MapEndpoints: WebApplication -> unit
      MigrationVersions: string list }
```

- `DemoModule.descriptor`（`src/Modules/Demo/Api/DemoModule.fs`）注册 Demo Application 程序集、配置 `DemoOpenApi`、映射 `DemoEndpoints`，迁移版本为 `001_create_demos`、`002_index_demos_created`。
- `NotesModule.descriptor`（`src/Modules/Notes/Api/NotesModule.fs`）注册 Notes Application 程序集、OpenAPI 无额外变换、映射 `NoteEndpoints`，迁移版本为 `003_create_notes`。

`src/Host/Program.fs` 中固定列表：

```fsharp
let private modules: ModuleDescriptor list = [ DemoModule.descriptor; NotesModule.descriptor ]
```

Host 对每个描述符依次调用 `RegisterServices`、`ConfigureOpenApi`，构建应用后再调用 `MapEndpoints`。Host 本身不写 `/api/demos` 或 `/api/notes` 的路由字面量，也不引用 Demo/Notes 的 DTO、handler 或 store。

### 5.2 .fsproj 编译顺序

F# 的 `Compile Include` 顺序就是符号可见顺序，不能随意重排：

- SharedKernel：`Errors.fs` → `UnitOfWork.fs` → `Faults.fs`。
- Database：`Db.fs` → `Migrations.fs` → `Generated/SqlHydra.fs` → `Tables.fs`。
- Api：`SharedDtos.fs` → `HttpResults.fs` → `ModuleDescriptor.fs` → `OpenApiSupport.fs`。
- Demo.Application：`Ports.fs` → 命令 → 查询 → handlers。
- Demo.Infrastructure：`DemoMigrations.fs` → `SqliteDemoStore.fs`，并嵌入两个 SQL 资源。
- Demo.Api：`DemoDtos.fs` → `DemoOpenApi.fs` → `DemoEndpoints.fs` → `DemoModule.fs`。
- Notes.Application：`Ports.fs` → `CreateNoteCommand.fs` → `GetNoteQuery.fs` → handlers。
- Notes.Infrastructure：`NotesMigrations.fs` → `SqliteNoteStore.fs`。
- Notes.Api：`NoteDtos.fs` → `NoteEndpoints.fs` → `NotesModule.fs`。
- Composition：`SqliteWorkScope.fs` → `SqliteUnitOfWork.fs` → `Composition.fs`。

项目引用由 `Directory.Build.props` 的 `<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>` 强制显式化。实际依赖方向是：Api 与 Infrastructure 依赖 Application，Application 依赖 Domain；Composition 引用两个模块的 Application/Infrastructure；Host 引用两个 Api 与 Composition。`FssoStack.slnx` 只是解决方案清单，按 src/tests 分组列出项目，不改变编译顺序。

### 5.3 启动装配

`src/Host/Program.fs` 的 `buildApp` 顺序：

1. `databasePath()`：先执行旧默认数据库 fail-closed 检查，再解析 `FSSO_DB_PATH`，缺省 `data/fsso.db`。
2. `Composition.migrate`：同步执行迁移。
3. 创建 `WebApplication.CreateBuilder`，配置 camelCase JSON。
4. `Composition.registerInfrastructure`：`StoreFactory.validate()` 后注册单例 `IUnitOfWork`。
5. 注册 `IFaultInjector`、基础 OpenAPI、模块服务与模块 OpenAPI。
6. `builder.Build()`。
7. 映射模块端点、统一异常中间件、`/api/health`、`MapOpenApi`、静态文件与 API 404 回退。

`--migrate-only` 在 `main` 中提前分支，只执行 `Composition.migrate` 后退出，不构建 Web 宿主。

## 6. DTO、OpenAPI、SDK 的生成边界

### 6.1 DTO

- 模块 HTTP DTO 只放在各自的 Api 项目：`DemoDtos.fs`、`NoteDtos.fs`。
- 共享错误与健康响应在 `src/Shared/Fsso.Api/SharedDtos.fs`：`ErrorResponse { StatusCode; Code; Message; TraceId }`、`HealthResponse { Status }`。
- Domain 类型不直接序列化为 HTTP 契约；端点显式调用 `demoResponse` / `noteResponse` 做映射。
- 不手写前端 DTO；前端类型来自生成的 SDK。

### 6.2 OpenAPI

- `src/Shared/Fsso.Api/OpenApiSupport.fs` 注册名为 `v1` 的文档，清空 `Servers`，固定标题 `FSSO Stack API` 与版本 `1.0.0`。
- `src/Modules/Demo/Api/DemoOpenApi.fs` 为 `GET /api/demos` 补 `page`、`limit` 查询参数，并补充 `CreateDemoRequest.name`、`DemoResponse` 必填字段。
- 端点上的 `WithName` 决定 operation ID：`createDemo`、`listDemos`、`getDemo`、`deleteDemo`、`createNote`、`getNote`；`Program.fs` 的 `health` 是第 7 个。
- `scripts/gen-openapi.mjs` 用临时数据库启动 Host，读取 `/openapi/v1.json`，要求恰好 7 个 operation ID，然后写 `openapi/openapi.json`。OpenAPI 文件由生成器产生，不手改。

### 6.3 SDK

- `web/openapi-ts.config.ts` 把 `openapi/openapi.json` 作为输入，输出到 `web/src/lib/api/generated`，插件为 TypeScript、client-fetch 与 SDK。
- `scripts/gen-sdk.mjs` 调用 hey-api，并检查生成的源码包含六个业务操作和 `DemoResponse`、`CreateDemoRequest`、`PagedDemoResponse`、`NoteResponse`、`CreateNoteRequest` 类型。
- `web/src/lib/api/index.ts` 统一导出生成 SDK 与配置后的 client；`web/src/lib/api/client.ts` 只在设置了 `VITE_API_BASE_URL` 时覆盖同源默认地址。
- `web/src/App.svelte` 从 `$lib/api` 导入 `createDemo`、`listDemos`、`getDemo`、`deleteDemo`，所有请求走生成 SDK，不手写 `fetch`/`axios`。
- 生成目录与 OpenAPI 快照由 `scripts/contract-check.mjs` 按 `scripts/contract-hashes.json` 校验哈希。修改契约必须重新运行生成器并更新哈希，不能手工编辑生成文件。

## 7. 迁移顺序、备份与恢复

### 7.1 迁移

- 迁移 SQL 由模块拥有并作为嵌入资源：
  - Demo：`Migrations/001_create_demos.sql`、`Migrations/002_index_demos_created.sql`。
  - Notes：`Migrations/003_create_notes.sql`。
- `.fsproj` 的 `EmbeddedResource` 同时指定 `LogicalName="migrations.<version>.sql"`。
- `DemoMigrations.load` / `NotesMigrations.load` 读取以 `migrations.` 开头的资源，按 Ordinal 排序，去掉前缀与 `.sql` 得到版本字符串。
- `Composition.fs` 合并为 `DemoMigrations.all @ NotesMigrations.all`，再交给 `Migrations.apply`。
- `src/Shared/Fsso.Database/Migrations.fs` 先建 `schema_migrations(version, applied_at)`，再按 `Version` 排序逐个迁移；每个迁移先查询是否已应用，未应用才执行 SQL 并写入版本记录。重复启动幂等。
- 迁移是 forward-only：没有自动 down migration。已应用的 SQL 不应修改，只能新增编号迁移。

### 7.2 数据库路径

- 默认：`data/fsso.db`，相对于进程工作目录，父目录自动创建。
- 覆盖：`FSSO_DB_PATH`，建议绝对路径。
- `Program.fs` 在未显式设置 `FSSO_DB_PATH` 且发现旧默认库文件时 fail closed：不打开、不移动、不删除旧文件，直接报错并给出备份/恢复指引。
- 连接串由 `src/Shared/Fsso.Database/Db.fs` 构造：`ReadWriteCreate`、关闭连接池、私有缓存；打开后启用外键与 5 秒 busy timeout。没有 WAL，也不是多实例方案。

### 7.3 备份/恢复验证

`scripts/sqlite-backup-check.mjs` 针对已发布的 `artifacts/publish/Fsso.Host.dll`：

1. 用临时源数据库启动 Host，通过 HTTP 创建 Demo。
2. 停止 Host，用 `sqlite3 .timeout 5000` 预检行数，再 `.backup` 到备份文件。
3. 校验备份行数，用 `.restore` 恢复到新文件。
4. 用恢复路径启动 Host，重新 GET/列表确认业务数据可读；脚本不执行 `PRAGMA integrity_check`，也不单独断言 `schema_migrations`。

README 第 10 节给出人工备份/恢复命令。生产升级顺序应为：停止应用 → 做并验证备份 → 部署新构建 → 启动触发迁移 → 验证健康与数据；回滚时若 schema 已变，需要同时恢复匹配备份。

## 8. 开发与生产路径

### 8.1 开发

`scripts/dev.mjs` 并行启动：

- `dotnet run --project src/Host --no-launch-profile --urls http://127.0.0.1:5080`，数据库 `artifacts/dev.db`，环境 `Development`。
- Vite `127.0.0.1:5173`，代理 `/api` 与 `/openapi` 到 5080。

脚本等待 `/api/health` 与 Vite 首页，再通过 Vite 代理请求 `/api/demos` 做冒烟，退出时清理自己拥有的进程树。

### 8.2 生产

`scripts/build.mjs` 执行前端构建，把产物复制到 `src/Host/wwwroot`，再 `dotnet publish` 到 `artifacts/publish`。生产运行时只有一个 .NET 进程：

- `ASPNETCORE_ENVIRONMENT=Production`；
- 静态文件来自 `wwwroot`；
- `/api` 与静态 SPA 同源；
- 未知 `/api/*` 返回 JSON 404，不回退到 `index.html`。

`Development` 下不使用 Kestrel 静态 SPA，前端由 Vite 提供。

## 9. 测试分层

| 层次 | 位置 | 关注点 |
|---|---|---|
| Domain 单测 | `tests/Domain.Tests`（5 个） | 纯领域校验，无数据库/HTTP |
| Application 单测 | `tests/Application.Tests`（6 个） | 用 fake `IDemoStore` / `IUnitOfWork` 验证 handler 的校验、错误与调用顺序 |
| Integration | `tests/Integration.Tests`（20 个） | 真实 SQLite、真实 HTTP、迁移、分页、回滚、OpenAPI 文档 |
| CQRS/启动 | `tests/Cqrs.Tests`（13 个） | MediatR handler 选择、Host 装配、错误映射、取消/异常回滚、旧默认路径 fail-closed |
| Notes 后端 | `tests/Notes.Tests`（8 个） | Notes HTTP/SQLite、迁移、重启，以及 Demo+Notes 跨模块提交/Error/异常/取消回滚 |
| 前端单测 | `web/src/lib/demo-helpers.test.ts`（5 个，Vitest） | 纯函数分页/格式化/错误处理 |
| 浏览器 | `web/e2e/demo.spec.ts`（5 个，Playwright） | 真实发布进程上的创建、列表、详情、删除与错误状态 |

`scripts/test.mjs` 会构建/发布，按 TRX 精确比较原始测试名称（`tests/original-test-names.json`），单独计数 CQRS 13 与 Notes 8，执行前端检查/单测、Playwright 与 SQLite 备份恢复。原始 31 个后端测试身份不得被注释任务改变。

其他可执行检查：

- `scripts/architecture-check.mjs`：项目引用图、模块源码边界、Host descriptor、迁移版本、Demo/test 33 文件 manifest 与禁止 fixture。
- `scripts/structure-check.mjs`：目录、项目、程序集、环境变量、默认 DB、OpenAPI 标题、UI 与归档名。
- `scripts/brand-check.mjs`：历史品牌词扫描（大小写不敏感、二进制安全）。
- `scripts/contract-check.mjs` / `scripts/demo-contract-check.mjs`：OpenAPI/SDK 哈希与 Demo 契约子集。
- `scripts/negative-control.mjs`：验证失败子进程不会被误报为成功。
- `scripts/comment-coverage-check.mjs` / `scripts/comment-equivalence-check.mjs`：中文注释覆盖与去注释等价性。

## 10. 如何新增一个模块

以 Notes 为最小模板、Demo 为完整 CRUD 模板。核心原则是只增加新模块文件，尽量不修改其他模块源码。

1. **Domain**：新增 `src/Modules/<Name>/Domain/Fsso.Modules.<Name>.Domain.fsproj` 与实体/校验文件。Domain 不引用任何项目。
2. **Application**：新增 `.../Application/Fsso.Modules.<Name>.Application.fsproj`，包含 `Ports.fs`、每个命令/查询一个文件、每个 handler 一个文件；引用 Domain + SharedKernel，包为 FsToolkit.ErrorHandling 5.2.0 与 MediatR 12.5.0。
3. **Infrastructure**：新增 `.../Infrastructure/Fsso.Modules.<Name>.Infrastructure.fsproj`、`Migrations/` 下新的只向前 SQL、`*Migrations.fs` 嵌入式资源读取器和 SQLite store。引用 Domain/Application + SharedKernel + Database。不要修改已应用迁移。
4. **Api**：新增 `.../Api/Fsso.Modules.<Name>.Api.fsproj`，包含 DTO、端点与 `<Name>Module.fs` 描述符。端点应注入 `ISender`，写入走共享 `IUnitOfWork`。
5. **组合根**：
   - 在 `src/Composition/Fsso.Composition/Fsso.Composition.fsproj` 添加新模块 Application 与 Infrastructure 引用；
   - 在 `Composition.fs` 的 `migrations` 中合并新模块迁移；
   - 在 `SqliteUnitOfWork.fs` 的 `StoreKeys` 增加端口类型键、`StoreFactory` 增加工厂、`Run` 中把新 store 放入 `stores` 字典；
   - `SqliteWorkScope` 是通用作用域，通常不需要按模块修改。
6. **Host**：在 `src/Host/Fsso.Host.fsproj` 添加新模块 Api 的 `ProjectReference`，再在 `Program.fs` 的 `modules` 列表加入 `<Name>Module.descriptor`。不要在 Host 写路由字面量或业务 DTO。
7. **解决方案与检查脚本**：把新项目加入 `FssoStack.slnx`；更新 `scripts/architecture-check.mjs` 的期望边/禁止边、`scripts/structure-check.mjs` 的必需文件与项目列表、`scripts/check-mediatr.mjs` 的模块列表、`scripts/gen-openapi.mjs` 的 operation ID、`scripts/gen-sdk.mjs` 的必需操作/类型、`scripts/test.mjs` 的套件编排，以及 `scripts/package-source.mjs` 的必需文件。
8. **生成物**：运行 `bash scripts/gen-sqlhydra.sh`、`pnpm gen:openapi`、`pnpm gen:sdk`。运行生成器后更新 `scripts/contract-hashes.json`，由 `scripts/contract-check.mjs` 校验，不要手改 `Generated/SqlHydra.fs` 或 `web/src/lib/api/generated`。
9. **测试**：新增专用测试项目，保留原始套件身份；至少覆盖 HTTP/SQLite 往返、校验、重启与事务回滚。除非任务明确要求，不要增加前端 UI 或浏览器旅程。

## 11. 建议的阅读顺序

1. `src/Shared/Fsso.SharedKernel/UnitOfWork.fs`：先理解 `IWorkScope` 与 `IUnitOfWork`。
2. `src/Composition/Fsso.Composition/SqliteUnitOfWork.fs`：再看单连接/单事务与提交规则。
3. `src/Modules/Demo/Api/DemoEndpoints.fs` 与 `DemoModule.fs`：理解 HTTP 到消息的映射。
4. `CreateDemoHandler.fs`、`DemoEndpoints.fs` 的列表/详情/删除、`Ports.fs`、`SqliteDemoStore.fs`：完整走一遍 CRUD。
5. `src/Modules/Notes`：对照最小模块，理解如何复用共享事务。
6. `src/Host/Program.fs`、`Composition.fs`、各 `.fsproj`：理解装配与编译边界。
7. `scripts/gen-openapi.mjs`、`scripts/gen-sdk.mjs`、`web/openapi-ts.config.ts`：理解契约生成边界。
8. `tests/*` 与 `scripts/*check*.mjs`：理解哪些行为被自动化验证。

再次强调：Demo 与 Notes 是示例，不是临床、医疗、金融或资金系统，也不提供认证、审计或真实数据保护承诺。
