// 文件职责：ModuleDescriptor 以名称、服务注册、OpenAPI 配置、端点映射和迁移版本列表描述一个模块，并标注 NoComparison 与 NoEquality，让 Host 通过函数字段统一装配而不引用模块内部类型。
namespace Fsso.Api

open Microsoft.AspNetCore.Builder
open Microsoft.Extensions.DependencyInjection

[<NoComparison; NoEquality>]
type ModuleDescriptor =
    { Name: string
      RegisterServices: IServiceCollection -> unit
      ConfigureOpenApi: IServiceCollection -> unit
      MapEndpoints: WebApplication -> unit
      MigrationVersions: string list }
