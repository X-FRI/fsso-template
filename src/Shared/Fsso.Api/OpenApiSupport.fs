// 文件职责：OpenApi.configure 注册名为 v1 的 OpenAPI 文档，在文档变换中清空 Servers 并固定标题 FSSO Stack API 与版本 1.0.0，作为所有模块共享的基础契约配置，该配置只影响文档生成。
namespace Fsso.Api

open System.Threading.Tasks
open Microsoft.Extensions.DependencyInjection
open Microsoft.OpenApi

module OpenApi =
    let configure (services: IServiceCollection) =
        services.AddOpenApi(
            "v1",
            fun options ->
                options.AddDocumentTransformer(
                    System.Func<OpenApiDocument, Microsoft.AspNetCore.OpenApi.OpenApiDocumentTransformerContext, System.Threading.CancellationToken, Task>(fun document _ _ ->
                        match document.Servers with
                        | null -> ()
                        | servers -> servers.Clear()

                        document.Info.Title <- "FSSO Stack API"
                        document.Info.Version <- "1.0.0"
                        Task.FromResult document)
                )
                |> ignore
        )
        |> ignore
