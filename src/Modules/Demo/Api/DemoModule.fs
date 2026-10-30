// 文件职责：Demo 模块描述符声明名称、AddMediatR 扫描 CreateDemoCommand 所在程序集、OpenAPI 配置、端点映射和 001_create_demos 与 002_index_demos_created 两个迁移版本，使 Host 只依赖描述符，迁移清单必须与目录实际文件一致。
namespace Fsso.Demo.Api

open System
open Microsoft.Extensions.DependencyInjection
open MediatR
open Fsso.Api
open Fsso.Application

module DemoModule =
    let descriptor: ModuleDescriptor =
        { Name = "Demo"
          RegisterServices =
            fun services ->
                services.AddMediatR(
                    Action<MediatRServiceConfiguration>(fun config ->
                        config.RegisterServicesFromAssembly(typeof<CreateDemoCommand>.Assembly) |> ignore)
                )
                |> ignore
          ConfigureOpenApi = DemoOpenApi.configure
          MapEndpoints = DemoEndpoints.map
          MigrationVersions = [ "001_create_demos"; "002_index_demos_created" ] }
