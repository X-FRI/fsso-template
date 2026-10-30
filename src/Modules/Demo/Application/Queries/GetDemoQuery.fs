// 文件职责：获取单个 Demo 的查询记录仅包含 DemoId，并实现 IRequest<Result<Demo, AppError>>，作为端点与 GetDemoHandler 之间稳定的读取契约，查询对象不可变且不携带分页参数。
namespace Fsso.Application

open MediatR
open Fsso.Domain

type GetDemoQuery =
    { Id: DemoId }
    interface IRequest<Result<Demo, AppError>>
