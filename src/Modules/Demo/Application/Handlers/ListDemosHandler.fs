// 文件职责：ListDemosHandler 先校验页码至少为一、页大小在一到一百之间并防止 page 与 limit 相乘溢出 Int32，再在 uow.Run 中调用 IDemoStore.List 返回 PagedDemos，非法参数在进入存储前直接失败。
namespace Fsso.Application

open System
open System.Threading.Tasks
open FsToolkit.ErrorHandling
open MediatR

type ListDemosHandler(uow: IUnitOfWork) =
    interface IRequestHandler<ListDemosQuery, Result<PagedDemos, AppError>> with
        member _.Handle(query, ct) =
            if query.Page < 1 then
                Task.FromResult(Error(AppError.validation "Page must be at least 1."))
            elif query.Limit < 1 || query.Limit > 100 then
                Task.FromResult(Error(AppError.validation "Limit must be between 1 and 100."))
            elif int64 query.Page * int64 query.Limit > int64 Int32.MaxValue then
                Task.FromResult(Error(AppError.validation "Page is too large."))
            else
                uow.Run
                    (fun scope token ->
                        taskResult {
                            let store = scope.Store<IDemoStore>()
                            let! paged = store.List(query.Page, query.Limit, token)
                            return paged
                        })
                    ct
