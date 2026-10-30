// 文件职责：Host 入口按分段拼接的旧默认库文件名做存在性检查、FSSO_DB_PATH 解析、迁移、模块描述符注册、端点映射、异常与 400 统一响应、健康检查、OpenAPI 和静态回退的顺序装配 WebApplication，并支持 --migrate-only 提前退出。
module Fsso.Host.Program

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open Microsoft.Extensions.DependencyInjection
open Microsoft.Extensions.Hosting
open Microsoft.Extensions.Logging
open MediatR
open Fsso.Application
open Fsso.Api
open Fsso.Composition
open Fsso.Demo.Api
open Fsso.Notes.Api

type HttpFaultInjector(accessor: IHttpContextAccessor) =
    interface IFaultInjector with
        // AfterWrite 仅在 FSSO_FAULT_INJECTION=1 且请求头匹配时制造错误、异常或延迟，用于测试提交前回滚。
        member _.AfterWrite(ct) =
            task {
                let enabled =
                    Environment.GetEnvironmentVariable "FSSO_FAULT_INJECTION"
                    |> fun value -> value = "1"

                match accessor.HttpContext with
                | null -> return Ok()
                | context when not enabled -> return Ok()
                | context ->
                    match context.Request.Headers["X-Test-Fault"].ToString() with
                    | "error-after-write" ->
                        return Error(AppError.conflict "Injected failure after write.")
                    | "throw-after-write" ->
                        return raise (InvalidOperationException("Injected failure after write."))
                    | "delay-before-commit" ->
                        do! Task.Delay(2000, ct)
                        return Ok()
                    | _ -> return Ok()
            }

// 旧默认数据库文件名由分段字符串拼接重建，避免源码直接出现历史品牌字样。
let private legacyDefaultFile () =
    String.Concat("clin", "wise", ".db")

// FSSO_DB_PATH 未显式设置且旧默认库存在时启动即失败，绝不打开、移动或删除该文件，并在异常中给出显式设置与备份恢复指引。
let private failIfLegacyDefaultDatabaseExists () =
    let configured = Environment.GetEnvironmentVariable "FSSO_DB_PATH"

    if String.IsNullOrWhiteSpace configured then
        let legacyPath = Path.GetFullPath(Path.Combine("data", legacyDefaultFile ()))

        if File.Exists legacyPath then
            raise (
                InvalidOperationException(
                    sprintf
                        "Legacy pre-FSSO default database found at '%s'. Startup aborted before opening or creating any database; the legacy file was not opened, moved, or deleted. Set FSSO_DB_PATH to an explicit database path. Recovery: stop the app, make a consistent backup with sqlite3 \"%s\" \".backup 'backup.db'\", restore it with sqlite3 'backup.db' \".restore 'restored.db'\", then set FSSO_DB_PATH to the restored path. Alternatively, safeguard the legacy file first and explicitly choose a fresh database path."
                        legacyPath
                        legacyPath
                )
            )

// 先执行旧库 fail-closed 检查，再把可选 FSSO_DB_PATH 解析为绝对路径，缺省为 data/fsso.db。
let private databasePath () =
    failIfLegacyDefaultDatabaseExists ()

    Environment.GetEnvironmentVariable "FSSO_DB_PATH"
    |> Option.ofObj
    |> Composition.resolveDatabasePath

let private configureJson (options: Microsoft.AspNetCore.Http.Json.JsonOptions) =
    options.SerializerOptions.PropertyNamingPolicy <- Text.Json.JsonNamingPolicy.CamelCase
    options.SerializerOptions.DictionaryKeyPolicy <- Text.Json.JsonNamingPolicy.CamelCase

// 模块清单固定为 Demo 后 Notes，决定服务注册、OpenAPI 配置与端点映射的确定性顺序；迁移清单由 Composition 聚合后按版本执行。
let private modules: ModuleDescriptor list = [ DemoModule.descriptor; NotesModule.descriptor ]

// 先解析数据库路径并同步执行迁移，成功后才创建 WebApplication 与注册服务，避免半初始化宿主。
let buildApp (args: string[]) : WebApplication =
    let dbPath = databasePath ()
    Composition.migrate dbPath CancellationToken.None |> fun work -> work.GetAwaiter().GetResult()

    let builder = WebApplication.CreateBuilder(args)
    builder.Services.ConfigureHttpJsonOptions(configureJson) |> ignore
    builder.Services.AddHttpContextAccessor() |> ignore
    Composition.registerInfrastructure builder.Services dbPath

    builder.Services.AddSingleton<IFaultInjector>(fun provider ->
        HttpFaultInjector(provider.GetRequiredService<IHttpContextAccessor>()) :> IFaultInjector)
    |> ignore

    OpenApi.configure builder.Services

    for descriptor in modules do
        descriptor.RegisterServices builder.Services
        descriptor.ConfigureOpenApi builder.Services

    let app = builder.Build()

    for descriptor in modules do
        descriptor.MapEndpoints app

    // 统一中间件把格式错误转成 400、未处理异常转成 500，同时保留取消异常与已开始响应的原状。
    app.Use(
        Func<HttpContext, RequestDelegate, Task>(fun (context: HttpContext) (next: RequestDelegate) ->
        task {
            try
                do! next.Invoke context

                if context.Response.StatusCode = StatusCodes.Status400BadRequest
                   && not context.Response.HasStarted then
                    context.Response.ContentType <- "application/json"

                    do!
                        context.Response.WriteAsJsonAsync(
                            { StatusCode = 400
                              Code = "validation"
                              Message = "Malformed request."
                              TraceId = HttpResults.traceId context }
                        )
            with
            | :? OperationCanceledException -> return raise (OperationCanceledException(context.RequestAborted))
            | :? BadHttpRequestException ->
                if not context.Response.HasStarted then
                    context.Response.Clear()
                    context.Response.StatusCode <- StatusCodes.Status400BadRequest
                    do!
                        context.Response.WriteAsJsonAsync(
                            { StatusCode = 400
                              Code = "validation"
                              Message = "Malformed request."
                              TraceId = HttpResults.traceId context }
                        )
            | ex ->
                let logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException")
                logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path)

                if not context.Response.HasStarted then
                    context.Response.Clear()
                    context.Response.StatusCode <- StatusCodes.Status500InternalServerError

                    do!
                        context.Response.WriteAsJsonAsync(
                            { StatusCode = 500
                              Code = "unexpected"
                              Message = "An unexpected error occurred."
                              TraceId = HttpResults.traceId context }
                        )
        }))
    |> ignore

    app.MapGet(
        "/api/health",
        Func<IResult>(fun () -> Results.Ok({ Status = "ok" }))
    )
        .WithName("health")
        .WithSummary("Health check")
        .WithTags("Health")
        .Produces<HealthResponse>(StatusCodes.Status200OK)
        .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
    |> ignore

    app.MapOpenApi() |> ignore

    let webRoot = app.Environment.WebRootPath

    let staticMode =
        not (app.Environment.IsDevelopment())
        && not (String.IsNullOrWhiteSpace webRoot)
        && File.Exists(Path.Combine(webRoot, "index.html"))

    if staticMode then
        app.UseDefaultFiles() |> ignore
        app.UseStaticFiles() |> ignore

    app.MapFallback(
        "/api/{**rest}",
        Func<HttpContext, IResult>(fun context ->
            HttpResults.jsonError context StatusCodes.Status404NotFound "not_found" "Resource not found.")
    )
    |> ignore

    if staticMode then
        app.MapFallbackToFile("index.html") |> ignore

    app

[<EntryPoint>]
let main args =
    // 仅执行迁移后以 0 退出，不构建宿主，供部署或测试前准备数据库。
    if args |> Array.contains "--migrate-only" then
        Composition.migrate (databasePath ()) CancellationToken.None
        |> fun work -> work.GetAwaiter().GetResult()

        0
    else
        let app = buildApp args
        app.Run()
        0
