// 文件职责：GetDemoHandler 把 GetDemoQuery 的 DemoId 交给当前作用域的 IDemoStore.FindById，命中返回 Demo，未命中转换为 not_found；该方法只读且不调用写入方法，提交或回滚由 IUnitOfWork 实现决定，使查询与展示层解耦。
namespace Fsso.Application

open FsToolkit.ErrorHandling
open MediatR
open Fsso.Domain

type GetDemoHandler(uow: IUnitOfWork) =
    interface IRequestHandler<GetDemoQuery, Result<Demo, AppError>> with
        member _.Handle(query, ct) =
            uow.Run
                (fun scope token ->
                    taskResult {
                        let store = scope.Store<IDemoStore>()
                        let! found = store.FindById(query.Id, token)

                        match found with
                        | Some demo -> return demo
                        | None -> return! Error(AppError.notFound "Demo not found.")
                    })
                ct
