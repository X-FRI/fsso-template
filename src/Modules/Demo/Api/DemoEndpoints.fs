// 文件职责：Demo 端点把 /api/demos 的创建、分页列表、按标识获取与删除请求转换为 MediatR 命令或查询，校验 page 与 limit 查询参数，并统一将 AppError 映射为带 StatusCode、Code、Message、TraceId 的 ErrorResponse JSON 及 201 Location。
namespace Fsso.Demo.Api

open System
open System.Globalization
open System.Threading
open System.Threading.Tasks
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open MediatR
open Fsso.Api
open Fsso.Application
open Fsso.Domain

module DemoEndpoints =
    let private tryQueryInt (key: string) (context: HttpContext) =
        let values = context.Request.Query[key]

        if values.Count = 0 then
            Ok None
        elif values.Count > 1 then
            Error(AppError.validation (sprintf "Query parameter '%s' must not be repeated." key))
        else
            match Int32.TryParse(values[0], NumberStyles.Integer, CultureInfo.InvariantCulture) with
            | true, value -> Ok(Some value)
            | false, _ -> Error(AppError.validation (sprintf "Query parameter '%s' must be an integer." key))

    let private badRequest (context: HttpContext) (message: string) =
        HttpResults.jsonError context StatusCodes.Status400BadRequest "validation" message

    let private mapError (context: HttpContext) (error: AppError) : IResult =
        HttpResults.toHttpResult context error

    let map (app: WebApplication) =
        app.MapPost(
            "/api/demos",
            Func<CreateDemoRequest, HttpContext, ISender, CancellationToken, Task<IResult>>(fun request context sender ct ->
                task {
                    let command: CreateDemoCommand =
                        { Name = request.Name
                          Description = DemoDtos.toDescription request.Description }

                    let! result = sender.Send(command, ct)

                    return
                        match result with
                        | Ok demo ->
                            let response = DemoDtos.demoResponse demo
                            Results.Created(sprintf "/api/demos/%s" response.Id, response)
                        | Error error -> mapError context error
                })
        )
            .WithName("createDemo")
            .WithSummary("Create a demo")
            .WithTags("Demos")
            .Accepts<CreateDemoRequest>("application/json")
            .Produces<DemoResponse>(StatusCodes.Status201Created)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore

        app.MapGet(
            "/api/demos",
            Func<HttpContext, ISender, CancellationToken, Task<IResult>>(fun context sender ct ->
                task {
                    match tryQueryInt "page" context, tryQueryInt "limit" context with
                    | Ok page, Ok limit ->
                        let page = defaultArg page 1
                        let limit = defaultArg limit 10
                        let! result = sender.Send(({ Page = page; Limit = limit }: ListDemosQuery), ct)

                        return
                            match result with
                            | Ok paged -> Results.Ok(DemoDtos.pagedDemoResponse page limit paged)
                            | Error error -> mapError context error
                    | Error error, _
                    | _, Error error -> return mapError context error
                })
        )
            .WithName("listDemos")
            .WithSummary("List demos")
            .WithTags("Demos")
            .Produces<PagedDemoResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore

        app.MapGet(
            "/api/demos/{id}",
            Func<string, HttpContext, ISender, CancellationToken, Task<IResult>>(fun id context sender ct ->
                task {
                    match DemoId.tryParse id with
                    | None -> return badRequest context "Invalid demo id."
                    | Some demoId ->
                        let! result = sender.Send(({ Id = demoId }: GetDemoQuery), ct)

                        return
                            match result with
                            | Ok demo -> Results.Ok(DemoDtos.demoResponse demo)
                            | Error error -> mapError context error
                })
        )
            .WithName("getDemo")
            .WithSummary("Get a demo")
            .WithTags("Demos")
            .Produces<DemoResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore

        app.MapDelete(
            "/api/demos/{id}",
            Func<string, HttpContext, ISender, CancellationToken, Task<IResult>>(fun id context sender ct ->
                task {
                    match DemoId.tryParse id with
                    | None -> return badRequest context "Invalid demo id."
                    | Some demoId ->
                        let! result = sender.Send(({ Id = demoId }: DeleteDemoCommand), ct)

                        return
                            match result with
                            | Ok() -> Results.NoContent()
                            | Error error -> mapError context error
                })
        )
            .WithName("deleteDemo")
            .WithSummary("Delete a demo")
            .WithTags("Demos")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore
