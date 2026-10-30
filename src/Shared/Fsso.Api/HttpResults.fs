// 文件职责：HttpResults 依据 AppError.Kind 把 Validation、NotFound、Conflict、Unexpected 四种错误映射为 400、404、409、500，并生成带 TraceId 的 ErrorResponse，traceId 优先取 Activity.Current.Id，否则回退到 HttpContext.TraceIdentifier，从而统一错误响应的状态码与正文结构供所有端点复用。
namespace Fsso.Api

open System.Diagnostics
open Microsoft.AspNetCore.Http
open Fsso.Application

module HttpResults =
    // traceId 优先取 Activity.Current.Id 作为跨服务追踪标识，缺失时回退到 HttpContext.TraceIdentifier。
    let traceId (context: HttpContext) =
        match Activity.Current with
        | null -> context.TraceIdentifier
        | activity ->
            match activity.Id with
            | null -> context.TraceIdentifier
            | id -> id

    // errorResponse 按 AppError.Kind 固定映射 400、404、409、500，并复用工厂提供的 Code 与 Message。
    let errorResponse (context: HttpContext) (error: AppError) =
        let statusCode =
            match error.Kind with
            | Validation -> StatusCodes.Status400BadRequest
            | NotFound -> StatusCodes.Status404NotFound
            | Conflict -> StatusCodes.Status409Conflict
            | Unexpected -> StatusCodes.Status500InternalServerError

        statusCode,
        { StatusCode = statusCode
          Code = error.Code
          Message = error.Message
          TraceId = traceId context }

    // jsonError 供 Demo 与 Notes 的校验 400 以及 Host 的 API 404 回退直接构造错误；Host 格式错误 400 使用内联 WriteAsJsonAsync，不经过此函数。
    let jsonError (context: HttpContext) (statusCode: int) (code: string) (message: string) : IResult =
        Results.Json(
            { StatusCode = statusCode
              Code = code
              Message = message
              TraceId = traceId context },
            statusCode = statusCode
        )

    // toHttpResult 把 AppError 经 errorResponse 转为 IResult，端点无需重复状态码判断。
    let toHttpResult (context: HttpContext) (error: AppError) : IResult =
        let statusCode, body = errorResponse context error
        Results.Json(body, statusCode = statusCode)
