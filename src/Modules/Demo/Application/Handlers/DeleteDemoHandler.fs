// 文件职责：DeleteDemoHandler 在 uow.Run 中通过 IDemoStore.FindById 判断目标是否存在，缺失时返回 AppError.notFound，存在时调用 Delete 与故障注入；提交或回滚由 IUnitOfWork 实现决定，重复删除会因目标已不存在而返回 notFound。
namespace Fsso.Application

open FsToolkit.ErrorHandling
open MediatR

type DeleteDemoHandler(uow: IUnitOfWork, fault: IFaultInjector) =
    interface IRequestHandler<DeleteDemoCommand, Result<unit, AppError>> with
        // Handle 先确认目标存在再删除；存在性检查与删除在同一 uow.Run 作用域内完成，具体事务由 IUnitOfWork 实现提供。
        member _.Handle(command, ct) =
            // uow.Run 内的查询、删除与 fault.AfterWrite 使用同一工作作用域和实现提供的回调 token；当前 SQLite 实现仅在 Ok 且写入计数大于零时提交，故障注入仅在测试启用时制造提交前失败。
            uow.Run
                (fun scope token ->
                    taskResult {
                        let store = scope.Store<IDemoStore>()
                        let! found = store.FindById(command.Id, token)

                        match found with
                        | None -> return! Error(AppError.notFound "Demo not found.")
                        | Some _ ->
                            do! store.Delete(command.Id, token)
                            do! fault.AfterWrite token
                            return ()
                    })
                ct
