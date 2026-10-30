// 文件职责：删除 Demo 的命令只携带 DemoId，并以 IRequest<Result<unit, AppError>> 表达无返回值的成功或应用错误，实际存在性判断和持久化由 DeleteDemoHandler 完成，命令本身不执行读取或删除操作。
namespace Fsso.Application

open MediatR
open Fsso.Domain

type DeleteDemoCommand =
    { Id: DemoId }
    interface IRequest<Result<unit, AppError>>
