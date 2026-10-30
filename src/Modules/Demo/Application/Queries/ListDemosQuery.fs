// 文件职责：分页列出 Demo 的查询记录携带 Page 与 Limit 两个整数，并声明 IRequest<Result<PagedDemos, AppError>>，参数边界由 ListDemosHandler 负责验证，该查询只描述分页意图而不执行校验。
namespace Fsso.Application

open MediatR

type ListDemosQuery =
    { Page: int
      Limit: int }
    interface IRequest<Result<PagedDemos, AppError>>
