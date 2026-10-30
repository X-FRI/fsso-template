// 文件职责：CreateDemoHandler 先用 Demo.create 校验并构造实体，把 ValidationError 转为 AppError.validation，再在 uow.Run 的作用域内调用 IDemoStore.Insert 和 fault.AfterWrite 并返回新建实体；领域校验失败不会进入工作单元，提交条件由具体 IUnitOfWork 实现决定。
namespace Fsso.Application

open System.Threading
open System.Threading.Tasks
open FsToolkit.ErrorHandling
open MediatR
open Fsso.Domain

module private CreateDemo =
    let mapValidation (error: ValidationError) =
        AppError.validation (ValidationError.message error)

type CreateDemoHandler(uow: IUnitOfWork, fault: IFaultInjector) =
    interface IRequestHandler<CreateDemoCommand, Result<Demo, AppError>> with
        // Handle 先完成 Demo.create 领域校验，失败时直接返回 AppError，不会开启工作单元或触碰数据库。
        member _.Handle(command, ct) =
            taskResult {
                let! demo =
                    Demo.create command.Name command.Description
                    |> Result.mapError CreateDemo.mapValidation

                return!
                    // uow.Run 在实现提供的作用域内执行回调，回调 token 由 IUnitOfWork 实现提供，不保证与传入 ct 相同；Insert 与 fault.AfterWrite 使用该 token，故障注入只在测试中制造提交前失败。
                    uow.Run
                        (fun scope token ->
                            taskResult {
                                let store = scope.Store<IDemoStore>()
                                do! store.Insert(demo, token)
                                do! fault.AfterWrite token
                                return demo
                            })
                        ct
            }
