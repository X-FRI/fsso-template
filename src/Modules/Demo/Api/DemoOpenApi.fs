// 文件职责：Demo OpenAPI 变换为 /api/demos 列表补 page、limit 查询参数，并把 CreateDemoRequest 的 name 与 DemoResponse 的 id、name、createdAt、updatedAt 标记为必填，仅修改文档 schema 而不改变运行时 DTO，这些变换只影响导出的契约文档。
namespace Fsso.Demo.Api

open System
open System.Threading.Tasks
open Microsoft.AspNetCore.OpenApi
open Microsoft.Extensions.DependencyInjection
open Microsoft.Extensions.Options
open Microsoft.OpenApi

module DemoOpenApi =
    let private addTransforms (options: OpenApiOptions) =
        options.AddDocumentTransformer(
            Func<OpenApiDocument, OpenApiDocumentTransformerContext, System.Threading.CancellationToken, Task>(fun document _ _ ->
                let queryParameter name description =
                    OpenApiParameter(
                        Name = name,
                        In = ParameterLocation.Query,
                        Description = description,
                        Required = false,
                        Schema = OpenApiSchema(Type = JsonSchemaType.Integer)
                    )

                match document.Paths.TryGetValue "/api/demos" with
                | true, path ->
                    path.Operations
                    |> Option.ofObj
                    |> Option.iter (fun operations ->
                        match operations.TryGetValue(System.Net.Http.HttpMethod.Get) with
                        | true, operation ->
                            operation.Parameters <-
                                System.Collections.Generic.List<IOpenApiParameter>(
                                    [ queryParameter "page" "Page number (default 1)" :> IOpenApiParameter
                                      queryParameter "limit" "Page size 1-100 (default 10)" :> IOpenApiParameter ]
                                )
                        | _ -> ())
                | _ -> ()

                Task.FromResult document)
        )
        |> ignore

        options.AddSchemaTransformer(
            Func<OpenApiSchema, OpenApiSchemaTransformerContext, System.Threading.CancellationToken, Task>(fun schema context _ ->
                let typeInfo = context.JsonTypeInfo

                if typeInfo.Type = typeof<CreateDemoRequest> then
                    match schema.Required with
                    | null -> schema.Required <- System.Collections.Generic.HashSet<string>([ "name" ])
                    | required -> required.Add "name" |> ignore

                if typeInfo.Type = typeof<DemoResponse> then
                    let requiredFields = [ "id"; "name"; "createdAt"; "updatedAt" ]

                    match schema.Required with
                    | null -> schema.Required <- System.Collections.Generic.HashSet<string>(requiredFields)
                    | required ->
                        for field in requiredFields do
                            required.Add field |> ignore

                Task.FromResult schema)
        )
        |> ignore

    let configure (services: IServiceCollection) =
        services.Configure<OpenApiOptions>(
            "v1",
            Action<OpenApiOptions>(fun options -> addTransforms options)
        )
        |> ignore
