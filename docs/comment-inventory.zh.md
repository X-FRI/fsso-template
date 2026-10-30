# 注释覆盖逐文件清单

状态：Task 4 最终清单；所有 A 类文件已完成职责注释，架构指南与清单自身已纳入。基线 `bf647e31f1cd0395d784d90935f37d7e56d27b80` 的 186 个 tracked 路径与本次新增交付文件逐一列出；不使用目录通配，不重复路径。A 类为本任务或后续任务需要添加 `文件职责：` 的手写源码、脚本或配置；B 类为生成物、锁文件、JSON、精确 fixture、复制 UI 代码或 Markdown 文档，并逐项给出冻结理由。父级澄清 `scripts/architecture-check.mjs` 属于人手写脚本，仅允许添加中文首部注释，运行逻辑和现有断言保持原样。

阶段说明：`config` 由 Task 1 完成；`backend` 由 Task 2 完成后端 F#、SQL 与相关项目文件；`frontend` 由 Task 3 完成测试、Svelte、TS、CSS 与 e2e；`full` 为 Task 4 最终全量复验。测试 `*.fs` 归入 Task 3 的 `frontend` 阶段，但其注释语法仍按 F# 处理。

manifest 例外：`tests/demo-module-files.sha256` 的 33 条路径全部保留；逐条记录基线旧 hash 与当前新 hash。若某条未发生字节变化则 hash 保持原值，本任务的 33 条均因新增中文职责注释而变化。路径集合不得增减。

受保护等价基线：`docs/evidence/comment-equivalence-baseline.bf647e31.json` 保存 bf647e31 源文件去注释后的规范化哈希，供无 git 源包自动加载；缺失或缺少成员时等价检查 fail closed，只有显式诊断模式才输出 NOT_VERIFIED 且不得作为验收证据。

| 路径 | 类别 | 阶段 | 状态 | 职责或冻结理由 | 旧 manifest hash | 新 manifest hash |
|---|---|---|---|---|---|---|
| `.config/dotnet-tools.json` | B | - | frozen | JSON 契约、配置或证据文件 .config/dotnet-tools.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `.gitignore` | A | config | done | 规定工具链、构建产物、数据库、日志、测试结果与前端 dist 的忽略范围，避免生成物污染版本库。 | - | - |
| `Directory.Build.props` | A | config | done | 统一 .NET 目标框架、可空性、警告即错误、语言版本、审计与文档文件开关，约束全部项目构建行为。 | - | - |
| `FssoStack.slnx` | A | config | done | 列出 src 与 tests 全部项目；src 实际顺序为 Composition、Host、Demo、Notes、Shared，tests 随后，只允许 XML 整行注释，不重排 Project 节点。 | - | - |
| `README.md` | B | - | n/a | Markdown 英文总览与使用说明，保留历史事实与原文，仅在 Task4 追加架构指南链接，故不作源码注释。 | - | - |
| `README_zh.md` | B | - | n/a | Markdown 中文总览与使用说明，保留历史事实与原文，仅在 Task4 追加架构指南链接，故不作源码注释。 | - | - |
| `docs/design.md` | B | - | n/a | Markdown 整体设计说明，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/evidence/baseline-backend-test-identities.json` | B | - | frozen | JSON 契约、配置或证据文件 docs/evidence/baseline-backend-test-identities.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `docs/fsso-modular-spec.md` | B | - | n/a | Markdown 模块化规格，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/fsso-stack-spec.md` | B | - | n/a | Markdown 整栈规格，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/ledger.md` | B | - | n/a | Markdown 实施台账，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/plans/2026-10-28-pre-fsso-starter.md` | B | - | n/a | Markdown 初始启动计划，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/plans/2026-10-29-fsso-modular.md` | B | - | n/a | Markdown 模块化计划，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/plans/2026-10-29-fsso-stack.md` | B | - | n/a | Markdown 整栈计划，保留历史事实与原文，不属于源码，故不添加源码职责注释。 | - | - |
| `docs/reviews/final-report.md` | B | - | n/a | Markdown 评审文档，记录早期整栈最终报告，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-final-report.md` | B | - | n/a | Markdown 评审文档，记录FSSO 整栈最终报告，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-modular-final-report.md` | B | - | n/a | Markdown 评审文档，记录模块化阶段最终报告，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-modular-review-log.md` | B | - | n/a | Markdown 评审文档，记录模块化阶段评审日志，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-modular-task1-implementer.md` | B | - | n/a | Markdown 评审文档，记录模块化任务一实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-modular-task2-implementer.md` | B | - | n/a | Markdown 评审文档，记录模块化任务二实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-shadcn-generator.md` | B | - | n/a | Markdown 评审文档，记录shadcn 生成器评审记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-task-1-implementer.md` | B | - | n/a | Markdown 评审文档，记录FSSO 任务一实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-task-2-implementer.md` | B | - | n/a | Markdown 评审文档，记录FSSO 任务二实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/fsso-task-3-implementer.md` | B | - | n/a | Markdown 评审文档，记录FSSO 任务三实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/task-1-implementer.md` | B | - | n/a | Markdown 评审文档，记录早期任务一实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/task-2-implementer.md` | B | - | n/a | Markdown 评审文档，记录早期任务二实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `docs/reviews/task-3-implementer.md` | B | - | n/a | Markdown 评审文档，记录早期任务三实现记录，不属于源码，故不加源码职责注释。 | - | - |
| `openapi/openapi.json` | B | - | frozen | JSON 契约、配置或证据文件 openapi/openapi.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `package.json` | B | - | frozen | JSON 契约、配置或证据文件 package.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `pnpm-lock.yaml` | B | - | frozen | pnpm 生成的锁文件，手工修改会破坏依赖解析与冻结安装，故不添加注释。 | - | - |
| `scripts/architecture-check.mjs` | A | config | done | 校验模块项目引用、禁用命名空间、Host 边界、迁移版本与 33 文件派生清单；按父级澄清仅添加中文首部注释，运行逻辑与断言保持不变。 | - | - |
| `scripts/brand-check.mjs` | A | config | done | 扫描已跟踪或文件系统路径及内容中的历史品牌字样，保证打包前后无遗留品牌；只读取文件，不修改任何源码。 | - | - |
| `scripts/build.mjs` | A | config | done | 调用 dotnet publish 生成 Host 静态站点并校验发布产物，作为生产构建入口，不改变项目引用或配置值。 | - | - |
| `scripts/check-mediatr.mjs` | A | config | done | 校验各模块 Application 项目的 MediatR 12.5.0、Apache-2.0 许可、解析版本与无付费注册标记。 | - | - |
| `scripts/check.mjs` | A | config | done | 串行执行品牌、结构、MediatR、契约、架构、Demo 契约、dotnet build 与 svelte-check，形成提交前检查链。 | - | - |
| `scripts/contract-check.mjs` | A | config | done | 按契约哈希清单逐个校验 OpenAPI 与生成的 SDK 文件 SHA256，防止生成契约在注释任务中漂移。 | - | - |
| `scripts/contract-hashes.json` | B | - | frozen | JSON 契约、配置或证据文件 scripts/contract-hashes.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `scripts/demo-contract-check.mjs` | A | config | done | 从基线提交提取 Demo OpenAPI 与 SDK 子集并对照快照，锁定 4 个操作（createDemo、deleteDemo、getDemo、listDemos）契约不被改写。 | - | - |
| `scripts/demo-contract.json` | B | - | frozen | JSON 契约、配置或证据文件 scripts/demo-contract.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `scripts/demo-sdk-contract.json` | B | - | frozen | JSON 契约、配置或证据文件 scripts/demo-sdk-contract.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `scripts/dev.mjs` | A | config | done | 并行启动后端 dotnet 与前端 Vite 开发服务，负责本地联调进程编排、日志与退出清理。 | - | - |
| `scripts/gen-openapi.mjs` | A | config | done | 启动 Host 导出 OpenAPI 文档并写入 openapi/openapi.json，是生成器入口，产物不允许手工编辑。 | - | - |
| `scripts/gen-sdk.mjs` | A | config | done | 调用 hey-api 从 OpenAPI 生成 TypeScript SDK 到 web/src/lib/api/generated，并检查必需操作名、类型名与 index.ts 存在；不执行契约或哈希比较。 | - | - |
| `scripts/gen-sqlhydra.sh` | A | config | done | 先执行迁移创建 schema 数据库，再运行 SqlHydra 生成 F# 表类型，并用 git diff 校验生成物稳定。 | - | - |
| `scripts/lib.mjs` | A | config | done | 为其他脚本提供仓库根、断言、子进程管理、HTTP 等待、哈希与 F# 注释剥离等共用基础设施。 | - | - |
| `scripts/negative-control.mjs` | A | config | done | 通过 runLogged 启动执行 process.kill(process.pid,'SIGKILL') 的子进程并断言非零退出，验证信号终止不会被误报为成功；不构造违规引用、不运行结构或架构检查。 | - | - |
| `scripts/package-source.mjs` | A | config | done | 在干净 git 树中打包源码、解包并执行安装、构建、测试、契约与重启验收；Task1 仅加首部注释，逻辑保持不变。 | - | - |
| `scripts/release-smoke.mjs` | A | config | done | 针对发布产物执行健康检查、Demo 与 Notes 冒烟、静态资源验证，作为发布前的快速门禁。 | - | - |
| `scripts/shadcn-add.mjs` | A | config | done | 调用 shadcn-svelte CLI 添加 UI 组件，记录 CLI 命令/版本并比较根 package.json 与 lockfile 生成前后哈希；不保存组件源码来源或组件级哈希。 | - | - |
| `scripts/sqlite-backup-check.mjs` | A | config | done | 创建 SQLite 备份并恢复，校验备份行数与恢复后 HTTP 读取；不运行 PRAGMA integrity_check，也不单独断言 schema_migrations。 | - | - |
| `scripts/store-registration-negative.mjs` | A | config | done | 生成缺失 store 注册的临时组合，验证应用启动失败即关闭的负控行为。 | - | - |
| `scripts/structure-check.mjs` | A | config | done | 校验目录分层、解决方案项目、程序集名、环境变量、OpenAPI 标题与 UI 品牌等结构约束。 | - | - |
| `scripts/test.mjs` | A | config | done | 编排完整测试矩阵，包括静态检查、后端各测试项目、前端单测、浏览器测试与备份恢复，并汇总 RC 与用例数。 | - | - |
| `sqlhydra.toml` | A | config | done | 配置 SqlHydra 的连接串、输出路径、命名空间、可空属性与 reader 类型，生成器严格按此读取。 | - | - |
| `src/Composition/Fsso.Composition/Composition.fs` | A | backend | done | 组合根注册入口，仅把 DemoMigrations.all 与 NotesMigrations.all 合并为迁移序列，校验 StoreFactory 并注册 IUnitOfWork；handler 由各模块描述符注册，store 由 SqliteUnitOfWork 反射构造。 | - | - |
| `src/Composition/Fsso.Composition/Fsso.Composition.fsproj` | A | config | done | 组合根项目，引用 Demo 与 Notes 的 Application/Infrastructure、共享内核与 Fsso.Database；handler 由模块描述符注册，Composition 聚合迁移、校验 StoreFactory 并注册 IUnitOfWork，store 由工作单元反射构造。 | - | - |
| `src/Composition/Fsso.Composition/SqliteUnitOfWork.fs` | A | backend | done | SQLite 工作单元实现，按请求打开连接并在进入 try 后按写入计数尝试统一提交或回滚 Demo 与 Notes 的写入；try 前的连接/PRAGMA/事务开启失败会直接传播，正常路径第一次回滚失败会进入 catch 分支再次回滚；非取消路径只在 catch 分支回滚失败时传播该次回滚异常，取消路径在 catch 分支回滚成功时重抛原取消异常、失败时传播该次回滚异常。 | - | - |
| `src/Composition/Fsso.Composition/SqliteWorkScope.fs` | A | backend | done | 工作作用域实现，仅持有 store 字典并通过泛型 Store<'T> 按类型解析端口实例，不包含连接与事务上下文，也不在释放时执行回滚；回滚由 SqliteUnitOfWork 负责。 | - | - |
| `src/Host/Fsso.Host.fsproj` | A | config | done | Web 宿主项目，引用两个模块 Api、组合根、共享 Api 与内核，只编译 Program.fs 并输出可执行 Host。 | - | - |
| `src/Host/Program.fs` | A | backend | done | Host 启动入口，读取数据库与故障注入环境变量，执行迁移、注册模块描述符、映射端点并提供静态文件与健康检查。 | - | - |
| `src/Modules/Demo/Api/DemoDtos.fs` | A | backend | done | Demo API 的请求与响应 DTO，定义 CreateDemoRequest、DemoResponse、PagedDemoResponse 及映射函数，供端点与 OpenAPI 共享；错误响应 ErrorResponse 位于 SharedDtos。 | c6f2c66f1b70baf8fbdf68ead0e92bf02fa4dd18fd0a0ed554d4587a1888bd4e | 4cfd7a687c81512731c479c1b02aa338dd84929d26efbe70f9cd0606b267207c |
| `src/Modules/Demo/Api/DemoEndpoints.fs` | A | backend | done | Demo HTTP 端点映射，把路由绑定到 MediatR 命令与查询，并统一转换 AppError 与成功结果。 | 7db166e4b4bfe7045c862e58d367bde1420b7751a4ac5b4e2efe358fe7e4a457 | 916cb12c0b3f59c9e3bcf799ee2b7900536da0454d4d358fbc44df9e6f79fb49 |
| `src/Modules/Demo/Api/DemoModule.fs` | A | backend | done | Demo 模块描述符，声明名称、服务注册、OpenAPI 配置、端点映射与两个迁移版本，使 Host 无需直接引用 Demo 类型；/api/demos 路由前缀硬编码在端点中。 | 7c2ea1aa9f01579f8a272741971b154b4b97aab8dc00c587826b05ebf05c8713 | 72948d6b17eb21fb465d6ae1624804c83c35edce9ceb1429e2b471f8b3b038d5 |
| `src/Modules/Demo/Api/DemoOpenApi.fs` | A | backend | done | Demo OpenAPI 变换，仅为 /api/demos 列表补 page、limit 查询参数，并把 CreateDemoRequest 的 name 与 DemoResponse 的 id、name、createdAt、updatedAt 标记为必填；标签与错误结构不在本文件。 | 80710b7d1d754859af3025ecd0463f18ecc36adf0ccaea7899ad6927b73f953b | 3563ed8f5f250c581844e3b919272401f03fd60453657710b648b7e5013e9001 |
| `src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj` | A | config | done | Demo Api 项目，按 DTO、OpenAPI、Endpoints、Module 顺序编译，并引用 Domain、Application、内核与共享 Api。 | 3c641195efcdc385f6d7e2d74ceba04ee5612d32c8ee22dc58cead3249a26ee3 | 5578cac4bfc465ba7ebdede5d5be384fd7c5932cedc782a20410d0cbf490fa7e |
| `src/Modules/Demo/Application/Commands/CreateDemoCommand.fs` | A | backend | done | 创建 Demo 的命令类型与输入校验入口，携带名称和描述并交给对应 handler 处理。 | 7a29f9dac16a2d7d98bd4f013b83ed65a5d9092d23b5978a1a4d39ed4ddcdce9 | caa4c39778a696f31eb42686115f01181fd44856e426d9e14372d1ad9c14036c |
| `src/Modules/Demo/Application/Commands/DeleteDemoCommand.fs` | A | backend | done | 删除 Demo 的命令类型，携带目标标识并交由删除 handler 执行存在性检查与写入。 | fe67fcaab92c2744efb008e18dd12deb17ed3b923d05fd9eb217f8428065a7a2 | f3cc9e4934b775cc541234df57ed88ec9e991fbae86e11b2d59cb4a8bf73891c |
| `src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj` | A | config | done | Demo Application 项目，编译端口、命令、查询与 handler，引用 Domain、内核及 MediatR 包。 | 6bf640969b14bf4b18484c26f2e93e61ea34ab2f108e33e31289f740ffdc0461 | 42d2675e1dab4fe3536315caf35d6cbe96df4f2daa97d54b1a8c4690442538b5 |
| `src/Modules/Demo/Application/Handlers/CreateDemoHandler.fs` | A | backend | done | 创建 Demo 的 handler，校验输入、构造领域实体、调用 IDemoStore 并返回创建结果。 | 05e99d6ddaa2cfda41df2ef0f9a83a542728992fd6f796b13a173e764de18c73 | a397cfe12ec6fbfc310abe7a60cf90cb2ae238748a59bc05c510d721a5780df1 |
| `src/Modules/Demo/Application/Handlers/DeleteDemoHandler.fs` | A | backend | done | 删除 Demo 的 handler，确认实体存在后调用 store 删除，并映射未找到等应用错误。 | 00fdbcf7bf9640825865bf42b33dd8b1b146d194be07f6a3396b478d87f524bf | ff6478bcbff0f3e4f234aaea5f3ae91fa4fe80e1a2219f2d5992d2956f936b02 |
| `src/Modules/Demo/Application/Handlers/GetDemoHandler.fs` | A | backend | done | 查询单个 Demo 的 handler，从 IDemoStore 读取并返回领域 Demo，由 API 端点转换为 DTO，未找到时产生 AppError。 | b5d818b1905077965345ad679ddcf96c94c542108010e5c669fc8b934cbc3d97 | 1cd22fc6dfe50e971028532f4370ca98d6214f808d921027a6fb22ca7ce02aaf |
| `src/Modules/Demo/Application/Handlers/ListDemosHandler.fs` | A | backend | done | 分页查询 Demo 的 handler，校验页码与页大小，调用 store 并返回分页响应。 | f5747ef0b41959ae9ab01871c002d462a228ce9c228de28566c403b7ae6b6b64 | 0b206e630d3dfa168531178be1bd029dab06edf4056b3c88669e12bc7a5c3f7d |
| `src/Modules/Demo/Application/Ports.fs` | A | backend | done | Demo 应用层端口定义，声明 IDemoStore 的读写能力，隔离 handler 与具体 SQLite 实现。 | 131d97cf5bde8522a473010c840ab3a8ee34cd20749953b6762556a520d589e3 | 19e91709e6ba0fbba1c3b7df31deaf5988a96866988ed8e494385069f05ed93a |
| `src/Modules/Demo/Application/Queries/GetDemoQuery.fs` | A | backend | done | 获取单个 Demo 的查询类型，携带目标标识，经 MediatR 分派给查询 handler。 | 7ea20a128eba71116b48ef353bb6495fd896d3b6b06231bd1e7f41df7d24f3e9 | 63a828c42d114fc81ac602f889068318f92fe7908c6f54a02e60e924ff51adaa |
| `src/Modules/Demo/Application/Queries/ListDemosQuery.fs` | A | backend | done | 分页列出 Demo 的查询类型，携带页码和页大小，供列表 handler 使用。 | 7e5ab639dd873ac7cc672462e2517709ec98380a268b57507e2a331966f0643f | e81d73cdc3419feb17950f3814391fcdc8c0d31e812d65b90e2a6b588d53864b |
| `src/Modules/Demo/Domain/Demo.fs` | A | backend | done | Demo 领域实体与校验规则，定义标识、名称、描述、创建时间以及非法输入的错误。 | 8d6453bf178cebd417febe0508ada7994085c713832d5c94b73ad09c196b91c5 | a58ab19a972c714c1a5904351799c354d0e04c9fbdcf62eddd2eb72f51aa032b |
| `src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj` | A | config | done | Demo Domain 项目，只承载无外部依赖的领域模型与校验，不引用应用层或基础设施。 | 17fa457a9f1c03f847bbe1544c891abe4921c9420b860b83c1af7d9affcd371b | 6e54fff68b84e0d94d7734eab4b3bcfddfb102ad3026d8165fc9435adeb4a433 |
| `src/Modules/Demo/Infrastructure/DemoMigrations.fs` | A | backend | done | Demo 模块迁移描述，按版本列出两条 SQL 迁移并在启动时交由共享迁移执行器。 | 1d42fc3855629af073cfd9d131ce1d370d5c3e2df0cc7a9f89adcba4fec083ce | fa509b5812dd1376309d718da691f14c94cef0a0acc33e7b6cbc3307633a8a71 |
| `src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj` | A | config | done | Demo Infrastructure 项目，编译迁移描述与 SQLite store，引用 Domain、Application、内核和数据库项目。 | 3635a91fdf41938a0f0f976da54e8299c2ae10550f9c9e4855cedf394dad0f24 | 1d2f0fcc98791e0079b6d9b75a695d3bc3dc5c5c45d47ceb21019e8f9e6d3179 |
| `src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql` | A | backend | done | Demo 第一个迁移，创建 demos 表、主键与必要列；只允许增加 SQL 行注释，语句与顺序不变。 | 4de5c1ac5f97d3a389a2c929cf9a5b0bd258ae87feaf8c52859338e3237edad2 | 39aed77e0f49e72e4db2f023e921a1177732ac20257c6d8fc6973b4c56182d67 |
| `src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql` | A | backend | done | Demo 第二个迁移，为 demos 创建时间建立索引以支持列表排序；注释不得改变索引定义。 | 353982e483ddd464792bb6c502de8b8a3838f5183950b572f7e98e1de03b405c | 356000d7d8a65aa44019608b5cdf1ebc7ee79f1122869661886a6944dbf9b0ee |
| `src/Modules/Demo/Infrastructure/SqliteDemoStore.fs` | A | backend | done | SQLite Demo 存储实现，使用当前工作作用域执行插入、查询、分页与删除，并映射数据库行到领域对象。 | 60bec5c753df1eab2c419d89c1de3b927881bb08eb4ae33381059c23b8c4ab1e | e60dad602dbc228a1999cd54cf804939008f0bbe313f39a5ff954ad7da7d52e5 |
| `src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj` | A | config | done | Notes Api 项目，按 DTO、Endpoints、Module 顺序编译并暴露 Notes 模块描述符。 | - | - |
| `src/Modules/Notes/Api/NoteDtos.fs` | A | backend | done | Notes API 的请求与响应 DTO，定义 CreateNoteRequest、NoteResponse 及 noteResponse/toBody/toIso 映射，供端点及 OpenAPI 契约使用；错误结构位于 SharedDtos。 | - | - |
| `src/Modules/Notes/Api/NoteEndpoints.fs` | A | backend | done | Notes HTTP 端点映射，将创建与获取请求绑定到 MediatR，并统一处理 201、200、400 与 404。 | - | - |
| `src/Modules/Notes/Api/NotesModule.fs` | A | backend | done | Notes 模块描述符，声明名称、服务注册、OpenAPI 配置、端点映射与唯一迁移版本 003_create_notes，使 Host 保持对 Notes 实现的无知；/api/notes 路由前缀硬编码在端点中。 | - | - |
| `src/Modules/Notes/Application/Commands/CreateNoteCommand.fs` | A | backend | done | 创建 Note 的命令类型，携带标题与正文并交由创建 handler 校验与持久化。 | - | - |
| `src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj` | A | config | done | Notes Application 项目，编译端口、命令、查询与 handler，依赖 Domain、内核与 MediatR。 | - | - |
| `src/Modules/Notes/Application/Handlers/CreateNoteHandler.fs` | A | backend | done | 创建 Note 的 handler，先调用领域构造校验输入，再在 uow.Run 内调用 INoteStore.Insert，最终返回 Result<Note, AppError>；HTTP Location 由端点生成。 | - | - |
| `src/Modules/Notes/Application/Handlers/GetNoteHandler.fs` | A | backend | done | 获取 Note 的 handler，通过 INoteStore 读取指定标识，未找到时返回应用错误。 | - | - |
| `src/Modules/Notes/Application/Ports.fs` | A | backend | done | Notes 应用层端口，声明 INoteStore 的 FindById 与 Insert，Insert 异步写入并返回 Task<Note>，端口不暴露事务控制，隔离 handler 与 SQLite 实现细节。 | - | - |
| `src/Modules/Notes/Application/Queries/GetNoteQuery.fs` | A | backend | done | 获取 Note 的查询类型，携带目标标识并交由查询 handler 解析。 | - | - |
| `src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj` | A | config | done | Notes Domain 项目，定义 Note 领域类型与不变量，保持对应用层和基础设施零依赖。 | - | - |
| `src/Modules/Notes/Domain/Note.fs` | A | backend | done | Note 领域实体与不变量，校验标题和正文并生成标识与时间戳，禁止空值或非法输入。 | - | - |
| `src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj` | A | config | done | Notes Infrastructure 项目，编译迁移描述与 SQLite store，引用 Domain、Application、内核和数据库项目。 | - | - |
| `src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql` | A | backend | done | Notes 迁移，创建 notes 表及主键列；仅可增加 SQL 行注释，不得改变迁移序号或语句。 | - | - |
| `src/Modules/Notes/Infrastructure/NotesMigrations.fs` | A | backend | done | Notes 模块迁移描述，声明版本 003 并在启动时与 Demo 迁移统一执行。 | - | - |
| `src/Modules/Notes/Infrastructure/SqliteNoteStore.fs` | A | backend | done | SQLite Notes 存储实现，使用 QueryContext 与 markWrite 插入和读取 Note，并把数据库行映射为领域对象；事务由工作单元挂到 context，构造参数 transaction 未直接使用。 | - | - |
| `src/Shared/Fsso.Api/Fsso.Api.fsproj` | A | config | done | 共享 HTTP/Api 层项目，编译 DTO、结果映射、模块描述符与 OpenAPI 支持，供各模块 Api 引用。 | - | - |
| `src/Shared/Fsso.Api/HttpResults.fs` | A | backend | done | HTTP 结果转换工具，把 AppError.Kind 映射为 400/404/409/500 并返回带 StatusCode、Code、Message、TraceId 的 ErrorResponse JSON，保持成功结果类型。 | - | - |
| `src/Shared/Fsso.Api/ModuleDescriptor.fs` | A | backend | done | 模块描述符类型，声明模块名 Name、服务注册 RegisterServices、OpenAPI 配置 ConfigureOpenApi、端点映射 MapEndpoints 与迁移版本 MigrationVersions，供 Host 统一装配；不包含路由前缀字段。 | - | - |
| `src/Shared/Fsso.Api/OpenApiSupport.fs` | A | backend | done | OpenAPI 辅助函数，注册名为 v1 的共享文档，在文档变换中清空 Servers 并设置标题 FSSO Stack API 与版本 1.0.0；不注册 schema 变换或错误响应描述。 | - | - |
| `src/Shared/Fsso.Api/SharedDtos.fs` | A | backend | done | 共享 API DTO，仅定义带 StatusCode/Code/Message/TraceId 的 ErrorResponse 与仅含 Status 的 HealthResponse；分页响应 PagedDemoResponse 位于 DemoDtos。 | - | - |
| `src/Shared/Fsso.Database/Db.fs` | A | backend | done | 数据库连接与环境解析，决定默认 data/fsso.db、覆盖路径和连接打开方式。 | - | - |
| `src/Shared/Fsso.Database/Fsso.Database.fsproj` | A | config | done | 共享数据库项目，编译连接、迁移执行、表类型与生成的 SqlHydra 代码，引用共享内核。 | - | - |
| `src/Shared/Fsso.Database/Generated/SqlHydra.fs` | B | - | frozen | SqlHydra 根据数据库 schema 生成的 F# 表类型，重新生成会覆盖，故不添加注释。 | - | - |
| `src/Shared/Fsso.Database/Migrations.fs` | A | backend | done | 迁移执行器，创建迁移历史表并按版本顺序执行各模块 SQL，保证重复启动幂等。 | - | - |
| `src/Shared/Fsso.Database/Tables.fs` | A | backend | done | 数据库表类型辅助，给出手写表映射或查询辅助，与生成的 SqlHydra 代码保持边界清晰。 | - | - |
| `src/Shared/Fsso.SharedKernel/Errors.fs` | A | backend | done | 共享应用错误类型，定义校验、未找到和冲突等错误分类及面向 API 的稳定错误码。 | - | - |
| `src/Shared/Fsso.SharedKernel/Faults.fs` | A | backend | done | 故障注入接口定义，仅声明 IFaultInjector.AfterWrite 在写入后接收取消令牌并返回 Result；环境开关与具体行为位于 Host 的 Program/HttpFaultInjector。 | - | - |
| `src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj` | A | config | done | 共享内核项目，编译错误、故障与工作单元抽象，是所有模块可依赖的最底层项目。 | - | - |
| `src/Shared/Fsso.SharedKernel/UnitOfWork.fs` | A | backend | done | 工作单元与作用域抽象，仅定义 IWorkScope.Store<'T> 与 IUnitOfWork.Run 的签名；提交、回滚语义及 token 与输入 ct 的关系由具体实现定义，不包含连接获取契约。 | - | - |
| `tests/Application.Tests/Fsso.Application.Tests.fsproj` | A | config | done | Demo 应用层测试项目，引用 Domain、Application 与内核，验证 handler 与端口协作。 | 2e21499838f774707ec7bbc31564b36a4b6f6e711b0afe326e6603d7eba2ea60 | 40f5c190500aff914b3bfab994036ac53e1c7630c65a6335b70e50c700bda7e0 |
| `tests/Application.Tests/Tests.fs` | A | frontend | done | Demo 应用层测试，覆盖创建、分页、查询与删除 handler 的校验、错误和 store 交互。 | 679af2b250d9d055dd0d78faab2f45ea91a2f56f78c7cd13925622264fd751a7 | cba9b2557d79035d0e7273b878fb68491d1cbb6e5af0276eef747133ad9667a4 |
| `tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj` | A | config | done | CQRS 与启动组合测试项目，引用 Demo 各层、共享内核、数据库、组合根和 Host（不引用 Notes），验证分派、缺失注册与失败关闭行为。 | 9093b0124ccc5800c807eaa4f105fcc7385229ef9ed3ac2e097a2339a42f3893 | ade46cb20e6b219230359fbb4171d642373d6fc022f8c7e23263d8afd7ec6429 |
| `tests/Cqrs.Tests/Support.fs` | A | frontend | done | CQRS 测试支撑代码，定位仓库根、生成 artifacts/cqrs 临时数据库路径、提供删库与行数辅助、通过 Host buildApp 启动应用并封装 HTTP 与错误形状辅助；不构造服务容器或模块注册。 | dde72e6f55c24398867f0bfe0578807764ed5adce9ff9d4b9ee85e3a45ab180f | 1d1ada0cfe2019a883d505b2f213ba683929cdf3c8042888cba8d42aa2592b18 |
| `tests/Cqrs.Tests/Tests.fs` | A | frontend | done | CQRS 测试用例，验证命令查询分派、缺失注册快速失败、启动装配与失败关闭行为。 | 87c85f409b4d1ea1e9f6b45b9e77de2592ae23d51e5d9e7700608c64807e4b35 | 5412b890aeb749da505b4ff23cfcc65878d07332e28c45b99c74cb1566fd71a8 |
| `tests/Domain.Tests/Fsso.Domain.Tests.fsproj` | A | config | done | Demo 领域测试项目，只引用 Demo Domain，验证实体不变量与校验错误。 | 40847f171925a9d2c9af370154d234001b143affe9cf99fdb401329739c45ab2 | 12efc81dc639db92c0dcc079bef9060c260180f8533c47a7416fea189db63537 |
| `tests/Domain.Tests/Tests.fs` | A | frontend | done | Demo 领域测试，验证实体构造、名称去空白、空名拒绝、长度上限、标识往返与校验错误等不变量。 | 7634fb4365842b2674a090ca902bdfe54c8a9791da84ae2454dd00e72767f2ca | 9ddbe96b9871ad2cf120c289f69f0560ee320011b933e1d43564c17e9e4c5bc5 |
| `tests/Integration.Tests/Fsso.Integration.Tests.fsproj` | A | config | done | 集成测试项目，引用 Demo 各层、共享内核、数据库、组合根与 Host（不引用 Notes），验证 HTTP、存储与 OpenAPI 行为；仅调用 deleteDb 的用例清理临时库。 | c21b0ebe266dc3fc9d77b3ae45ebf5174f97f08a5299c25dbdc418ba9bf1a348 | e670ecc7fccae5294fb33fd66ffd24c232c8c86549a9b72f4264ec9f4d24f698 |
| `tests/Integration.Tests/HostTests.fs` | A | frontend | done | Host 集成测试，验证 Demo CRUD、健康检查、统一错误响应与未知 API 的 JSON 404；不覆盖静态资源或 Notes 行为。 | 91d016daeef549ac3fac984eeb7c73b4f18bc0c7f70b655c5b3127aacae8e872 | c9815ee1b65f82e60fd899f0cdc94f4ea61c4ffa9ed082d10d6c6cff31c3189c |
| `tests/Integration.Tests/OpenApiTests.fs` | A | frontend | done | OpenAPI 集成测试，比较导出的路径、操作标识和 schema，防止契约漂移。 | - | - |
| `tests/Integration.Tests/StoreTests.fs` | A | frontend | done | 存储集成测试，针对 SQLite Demo store 验证插入、分页、删除与事务边界。 | 43b273064ed4b5be782f9ccb7d2df72e801b2a12e32e1f16c92172c557338337 | 47fd1cea592967de3c2d5c04832fe073182138bef5789106c96adfd202255cc6 |
| `tests/Integration.Tests/Support.fs` | A | frontend | done | 集成测试支撑，启动 Host、准备临时数据库并封装 HTTP 请求与断言。 | 8e05dd542074f82aea20f8ce02908017c958ad66414f831acbde300d7631cc83 | e717d6f3bce2f1904b56077bac7d9a284ac5a490226ce2388c030a46600be9eb |
| `tests/Notes.Tests/Fsso.Notes.Tests.fsproj` | A | config | done | Notes 模块测试项目，引用 Notes 各层及 Demo 基础设施，验证创建、查询与事务回滚。 | - | - |
| `tests/Notes.Tests/NotesTests.fs` | A | frontend | done | Notes 测试用例，覆盖创建、获取、未找到与输入校验，并核对响应头和持久化结果。 | - | - |
| `tests/Notes.Tests/Support.fs` | A | frontend | done | Notes 测试支撑，组合 Demo 与 Notes 迁移创建隔离数据库，提供数据库路径、按表行数、启动 Host 与 HTTP 辅助；不构造工作作用域或 store。 | - | - |
| `tests/Notes.Tests/TransactionTests.fs` | A | frontend | done | 跨模块事务测试，在同一 SQLite 工作单元内写入 Demo 与 Note，验证成功提交、Error 结果、抛出异常与取消四种路径下两张表同时保留或同时清空。 | - | - |
| `tests/demo-module-files.sha256` | B | - | exception | 派生架构测试清单，33 条路径集合保持不变；仅对因中文注释而实际改变字节的条目重算 SHA256，旧 hash 来自基线副本，新 hash 与当前清单逐行一致。 | - | - |
| `tests/original-test-names.json` | B | - | frozen | JSON 契约、配置或证据文件 tests/original-test-names.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `web/components.json` | B | - | frozen | JSON 契约、配置或证据文件 web/components.json 不支持注释，且属于冻结输入，故保留原始字节。 | - | - |
| `web/e2e/demo.spec.ts` | A | frontend | done | Demo 页面端到端测试，验证创建、列表、详情与删除流程及关键 test id，不新增业务功能。 | - | - |
| `web/e2e/start-backend.mjs` | A | frontend | done | Playwright 后端启动器，清理临时数据库并以固定端口 5080 启动 Host，不自行轮询健康检查；就绪等待由 Playwright webServer 的 url 完成。 | - | - |
| `web/e2e/start-frontend.mjs` | A | frontend | done | Playwright 前端启动器，以固定端口 5173 启动 Vite 开发服务器，不轮询页面；就绪等待由 Playwright webServer 的 url 完成。 | - | - |
| `web/index.html` | A | config | done | Vite 单页入口，挂载 #app 并加载 /src/main.ts，标题固定为 FSSO Stack，注释放在 doctype 之后。 | - | - |
| `web/openapi-ts.config.ts` | A | config | done | 指定 OpenAPI 输入、生成目录与 hey-api 插件组合，驱动 TypeScript SDK 生成且不手改生成物。 | - | - |
| `web/playwright.config.ts` | A | config | done | 定义 Playwright 测试目录、单 worker、Chromium 项目以及前后端 webServer 启动命令和健康检查地址。 | - | - |
| `web/postcss.config.js` | A | config | done | 注册 Tailwind 与 Autoprefixer 插件并指向 tailwind.config.js，供 Vite 构建处理 CSS。 | - | - |
| `web/src/App.svelte` | A | frontend | done | 前端主组件，仅管理 Demo 列表、表单、详情、删除、加载与错误状态，调用生成 SDK 并渲染 shadcn 组件；不包含 Notes 列表或表单。 | - | - |
| `web/src/app.css` | A | frontend | done | 全局样式入口，导入 Tailwind 指令并定义主题 CSS 变量、基础排版与组件外观。 | - | - |
| `web/src/lib/api/client.ts` | A | frontend | done | 前端 API 客户端封装，从 VITE_API_BASE_URL 读取可选基础地址，存在时调用 client.setConfig 并导出共享 client；不包含错误处理。 | - | - |
| `web/src/lib/api/generated/client.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/client/client.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/client/index.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/client/types.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/client/utils.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/auth.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/bodySerializer.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/params.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/pathSerializer.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/queryKeySerializer.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/serverSentEvents.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/types.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/core/utils.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/index.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/sdk.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/generated/types.gen.ts` | B | - | frozen | OpenAPI TypeScript SDK 生成代码，由 hey-api 在生成时覆盖，手工注释会被重写，故冻结。 | - | - |
| `web/src/lib/api/index.ts` | A | frontend | done | API 模块导出入口，统一暴露客户端与生成 SDK 类型，方便组件按稳定路径引用。 | - | - |
| `web/src/lib/components/ui/alert-dialog/alert-dialog.svelte` | B | - | frozen | 手写 Svelte 组合包装（非 shadcn-svelte registry 目标），定义 title/description/confirmLabel/cancelLabel/onConfirm 并复用 bits-ui primitive；CLI add 不会生成或覆盖此文件，冻结是为了保持自定义实现字节稳定。 | - | - |
| `web/src/lib/components/ui/alert-dialog/index.ts` | B | - | frozen | 手写 AlertDialog 包装的导出入口，仅重导出 ./alert-dialog.svelte 的自定义 AlertDialog，不是 shadcn-svelte registry 生成物，冻结以保持自定义组合实现稳定。 | - | - |
| `web/src/lib/components/ui/badge/badge.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/badge/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/button/button.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/button/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card-content.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card-description.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card-footer.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card-header.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card-title.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/card.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/card/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/input/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/input/input.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/skeleton/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/skeleton/skeleton.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/textarea/index.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/components/ui/textarea/textarea.svelte` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/lib/demo-helpers.test.ts` | A | frontend | done | Demo 辅助函数单元测试，验证分页、格式化和错误处理等纯函数行为。 | - | - |
| `web/src/lib/demo-helpers.ts` | A | frontend | done | Demo 前端辅助函数，提供 extractErrorMessage、totalPages、pageSummary 与 asErrorResponse 等与 UI 无关的纯逻辑；不包含日期显示或格式化。 | - | - |
| `web/src/lib/utils.ts` | B | - | frozen | shadcn-svelte 复制或生成的 UI 组件与工具代码，CLI 再生成会覆盖注释，故按来源冻结。 | - | - |
| `web/src/main.ts` | A | frontend | done | 前端启动入口，把 App.svelte 挂载到 #app，并加载全局 CSS。 | - | - |
| `web/src/vite-env.d.ts` | A | frontend | done | Vite 环境类型声明，提供 import.meta.env 与 Svelte 模块的类型提示。 | - | - |
| `web/svelte.config.js` | A | config | done | 启用 Svelte 的 Vite 预处理，供纯 Vite 集成使用而不引入 SvelteKit 路由。 | - | - |
| `web/tailwind.config.js` | A | config | done | 声明内容扫描范围、主题颜色与圆角扩展及 forms 插件，把设计变量映射到 Tailwind 类。 | - | - |
| `web/tsconfig.json` | B | - | frozen | TypeScript 配置（JSONC 语法本身支持注释），为保持冻结输入与字节稳定而有意不加注释，故保留原始字节。 | - | - |
| `web/vite.config.ts` | A | config | done | 配置 Vite 根目录、Svelte 插件、$lib 别名以及 /api 与 /openapi 开发代理。 | - | - |
| `docs/comment-standard-spec.zh.md` | B | - | n/a | 本次注释规范与架构阅读指南规格，是评审输入文档，不含源码，故不作源码注释。 | - | - |
| `docs/plans/2026-10-29-comment-coverage.zh.md` | B | - | n/a | 本次注释覆盖实施计划，记录任务拆分与验收命令，属于计划文档，故不作源码注释。 | - | - |
| `docs/comment-inventory.zh.md` | B | - | done | 本清单自身，逐路径记录类别、阶段、状态、职责或冻结理由及 manifest 哈希，属于文档而非源码。 | - | - |
| `scripts/comment-coverage-check.mjs` | A | config | done | 解析注释清单，校验基线加新文件的逐路径覆盖、B 类理由、冻结哈希、重复职责句与负控，并支持无 git 文件系统回退。 | - | - |
| `scripts/comment-equivalence-check.mjs` | A | config | done | 按语言语法剥离注释后与基线比较，支持 git show 提交基线和无 git 的基线目录或索引，输出逐文件结果。 | - | - |
| `docs/evidence/demo-module-files.baseline.bf647e31.sha256` | B | - | done | 基线清单原始字节副本，作为 33 文件旧 hash 与路径集合的只读证据，不适用源码注释。 | - | - |
| `docs/evidence/comment-equivalence-baseline.bf647e31.json` | B | - | frozen | 受保护的注释剥离基线索引，保存 bf647e31 各源文件去除注释后的规范化哈希，供无 git 源包逐文件比较；由等价脚本生成，不适用源码注释。 | - | - |
| `docs/architecture-guide.zh.md` | B | - | done | Task4 新增的架构阅读指南 Markdown，按真实源码追踪 Demo/Notes、MediatR、端口、SQLite store、共享工作单元、模块注册与生成边界，属于文档而非源码，不适用源码注释。 | - | - |

合计：194 行；基线 186 行；新增交付 8 行；A 类 117 行；B 类 77 行；manifest 33 条旧/新 hash 已逐条填写，路径集合与基线一致。

## 33 文件 manifest 旧/新哈希与等价/diff 证据

逐文件旧 hash 来自 `docs/evidence/demo-module-files.baseline.bf647e31.sha256`（`bf647e31` 原始清单副本），新 hash 为当前文件字节 SHA256，已逐行写入上表并与 `tests/demo-module-files.sha256` 完全一致。所有 33 条路径均因新增中文职责注释而改变字节，未触及条目为 0；路径集合保持 33 条不变。

Task 4 实际执行记录（工作目录均为当前仓库根目录）：

| 命令 | 结果 |
|---|---|
| 命令 `git show bf647e31:tests/demo-module-files.sha256 \| cmp - docs/evidence/demo-module-files.baseline.bf647e31.sha256` | RC 0，基线副本与 git 原始清单逐字节一致 |
| 当前清单与基线路径集合比较 | 33 / 33，`path_set_equal=true`，changed=33，untouched=0，missing=0 |
| 命令 `node scripts/comment-equivalence-check.mjs --phase full` | RC 0；117 files，OK=115，NEW=2（两个新检查脚本），去注释规范化文本与 `bf647e31` 基线一致 |
| 命令 `node scripts/comment-coverage-check.mjs --phase full` | RC 0；194 行 = 186 基线 + 8 新交付；A=117，B=77；33 manifest paths；117 个职责标记通过 |
| 命令 `node scripts/architecture-check.mjs` | RC 0；18 个项目、33 条 manifest、禁止 fixture 两类违规均被检出 |
| 命令 `node scripts/structure-check.mjs` | RC 0 |
| 命令 `node scripts/brand-check.mjs` | RC 0；186 条 tracked 路径与内容扫描通过 |
| 命令 `git diff --check` | RC 0，无空白错误 |
| 命令 `dotnet build FssoStack.slnx -warnaserror` | RC 0；0 warning / 0 error |

人工 diff 与等价结论：每个 manifest 文件只包含新增中文职责/边界/输入输出注释；SQL 文件仅新增 `--` 行注释，语句与顺序不变；`.fsproj` 仅新增 XML 注释，`Compile`/`EmbeddedResource`/`ProjectReference` 顺序与属性不变；测试文件仅新增说明性注释。`comment-equivalence-check` 的逐文件 `OK` 是剥离注释后与基线规范化文本完全相同的机器证据，人工 diff 用于确认差异类型均为注释。

## 过程与审查记录（持续更新）

- Task1 spec reviewer `ses_e785d0a62ffeUAjsL94SCuJwe4`：初始 REQUEST_CHANGES（manifest 冲突等旧裁决）；Task1 spec 复核 `ses_e78288e36ffeFnXV9BF5CjStm2`：修正 11 个 web phase 后 PASS。
- Task1 quality reviewer `ses_e7824f482ffe3OYzC190TVWzvV`：REQUEST_CHANGES（Svelte 顶层合法注释假阴性）；修复后 targeted PASS。
- **流程偏差（保留，不掩盖）**：该 reviewer 在第一次检查中执行过 `cp "$S/web/src/App.svelte" /tmp/_app_backup_$$`，违反禁止系统 `/tmp`；其 `RC=${PIPESTATUS[0]}` 输出为空，不能作为真实 RC。后续命令均限定项目或 scratch，并记录真实 RC；本任务不得声称流程完全合规。
- Svelte 假阴性已修复：`LineBuilder.finish` 不再为空注释段追加换行；新增顶层/style 正控与 markup 篡改负控。独立复测：完整基线 App.svelte 原始 RC0、顶部中文 HTML 注释 RC0、`lang="ts"`→`lang="js"` RC1。
- `comment-coverage-check` 已增加首部位置校验：职责标记移到文件末尾 RC1；Svelte 顶层合法标记 RC0。

## 最终逐行审计与流程偏差

- 194 条 inventory 行已逐行审计：117 A_ROW + 77 B_ROW，全部 PASS；证据 `artifacts/audit/final-inventory-audit.tsv`。
- 117 个 A 源路径的 268 条注释行全部 PASS；证据 `artifacts/audit/source-comment-audit.tsv`。
- 25 条旧假阴性对照全部 FIX；证据 `artifacts/audit/negative-controls.tsv`。
- Reviewer 会话 ID：group1 `ses_e77b307c5ffet1IFJLgOKK8G1H`；group2 `ses_e77b30767ffeZXfAlaJfUtKQQh`；group3 `ses_e77b30713ffeKReFW71U65M99y`；group4 `ses_e77b306aaffexyGwD4WgdqifJn`；group5 `ses_e77b3065effeN5ChVNisz1MN9H`。
- Inventory 组会话 ID：`ses_e77a110d7ffeK3HIrXv8a7jH0I`、`ses_e77a10f93fferJTUgd5Uh5myNg`、`ses_e77a10ec4ffeKTmNTvLxw4Rdel`、`ses_e77a10e13ffe5uTw8Hg6WbdBNB`、`ses_e77a10d35ffeGv6aBXaPoCg398`。
- Reaudit 会话 ID：`ses_e77963b81ffehaGLro1ZHRSCb3`、`ses_e77963a55ffeo7DTOhoXbmCVcG`、`ses_e7796395affeegvb6m3lbEpE5B`、`ses_e77963802ffe1MsfIkfiRkH10M`、`ses_e7792e68bffeuPBJ0LqVWnq7Vk`；source recheck `ses_e77918cf8ffemEOPe5xpIfywad`；aggregate validator `ses_e7789a382ffeGUGsun7uLHGvgs` PASS。
- 保留的流程偏差：Task1 quality reviewer 使用 `/tmp/_app_backup_$$` 且 `PIPESTATUS` 为空；spec reviewer `ses_e77cb0542ffeqDgApYYAReJYke` 写入 `/tmp/no`；group2 auditor 临时使用 `/tmp/nope`；顶层协调者直接编辑脚本（`deed8e3`、`48ef284`）；不得声称流程完全合规。
- v5/v6/v7/v8 均非最终版；v8 存在已知错误声明。最终交付包将重新生成。
- 除上述审计文件外，不修改任何表格行，也不扩大完整性声明。
