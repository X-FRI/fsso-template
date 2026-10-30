// 文件职责：创建 Demo 的应用命令位于 Fsso.Application，承载可空名称与可选描述，并以 IRequest<Result<Demo, AppError>> 声明由 MediatR 分派给 create handler 的返回契约，该命令本身不包含校验或持久化实现。
namespace Fsso.Application

open MediatR
open Fsso.Domain

type CreateDemoCommand =
    { Name: string | null
      Description: string option }
    interface IRequest<Result<Demo, AppError>>
