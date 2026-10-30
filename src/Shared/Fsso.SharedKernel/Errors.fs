// 文件职责：共享错误类型定义 Validation、NotFound、Conflict、Unexpected 四种 ErrorKind 和带 Kind、Code、Message、Cause 的 AppError，并通过 validation、notFound、conflict、unexpected 工厂稳定错误码，工厂函数统一错误码和消息以避免端点直接构造记录。
namespace Fsso.Application

// ErrorKind 只驱动 HTTP 状态码映射；事务回滚来自 Result.Error、零写入、取消及非取消异常路径，均不依赖该分类。
type ErrorKind =
    | Validation
    | NotFound
    | Conflict
    | Unexpected

// AppError 携带稳定 Code、可展示 Message 与可选 Cause；业务代码应使用工厂函数，不手工构造记录。
[<NoComparison; NoEquality>]
type AppError =
    { Kind: ErrorKind
      Code: string
      Message: string
      Cause: exn option }

module AppError =
    // validation、notFound、conflict、unexpected 固定各自错误码与默认消息，端点只需读取字段而不再判断原始异常。
    let validation message =
        { Kind = Validation
          Code = "validation"
          Message = message
          Cause = None }

    let notFound message =
        { Kind = NotFound
          Code = "not_found"
          Message = message
          Cause = None }

    let conflict message =
        { Kind = Conflict
          Code = "conflict"
          Message = message
          Cause = None }

    let unexpected (cause: exn) =
        { Kind = Unexpected
          Code = "unexpected"
          Message = "An unexpected error occurred."
          Cause = Some cause }

    let unexpectedMessage message =
        { Kind = Unexpected
          Code = "unexpected"
          Message = message
          Cause = None }
