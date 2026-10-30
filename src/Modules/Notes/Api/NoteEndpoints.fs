// 文件职责：Notes 端点把 /api/notes 创建请求和 /api/notes/{id} 获取请求分派给 MediatR，解析并拒绝非法 NoteId，成功时返回 201 Location 或 200 响应，错误统一交给 HttpResults，端点本身不包含存储或校验实现。
namespace Fsso.Notes.Api

open System
open System.Threading
open System.Threading.Tasks
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Http
open MediatR
open Fsso.Api
open Fsso.Application
open Fsso.Notes.Application
open Fsso.Notes.Domain

module NoteEndpoints =
    let private badRequest (context: HttpContext) (message: string) =
        HttpResults.jsonError context StatusCodes.Status400BadRequest "validation" message

    let private mapError (context: HttpContext) (error: AppError) : IResult =
        HttpResults.toHttpResult context error

    let map (app: WebApplication) =
        app.MapPost(
            "/api/notes",
            Func<CreateNoteRequest, HttpContext, ISender, CancellationToken, Task<IResult>>(fun request context sender ct ->
                task {
                    let command: CreateNoteCommand =
                        { Title = request.Title
                          Body = NoteDtos.toBody request.Body }

                    let! result = sender.Send(command, ct)

                    return
                        match result with
                        | Ok note ->
                            let response = NoteDtos.noteResponse note
                            Results.Created(sprintf "/api/notes/%s" response.Id, response)
                        | Error error -> mapError context error
                })
        )
            .WithName("createNote")
            .WithSummary("Create a note")
            .WithTags("Notes")
            .Accepts<CreateNoteRequest>("application/json")
            .Produces<NoteResponse>(StatusCodes.Status201Created)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore

        app.MapGet(
            "/api/notes/{id}",
            Func<string, HttpContext, ISender, CancellationToken, Task<IResult>>(fun id context sender ct ->
                task {
                    match NoteId.tryParse id with
                    | None -> return badRequest context "Invalid note id."
                    | Some noteId ->
                        let! result = sender.Send(({ Id = noteId }: GetNoteQuery), ct)

                        return
                            match result with
                            | Ok note -> Results.Ok(NoteDtos.noteResponse note)
                            | Error error -> mapError context error
                })
        )
            .WithName("getNote")
            .WithSummary("Get a note")
            .WithTags("Notes")
            .Produces<NoteResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status500InternalServerError)
        |> ignore
