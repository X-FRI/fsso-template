// 文件职责：CreateNoteHandler 调用 Note.create 校验标题与正文，把 ValidationError 映射为 AppError.validation，并在工作单元作用域内调用 INoteStore.Insert(note, token)，返回该调用得到的 Note 结果；提交/回滚与写入计数语义由具体 IUnitOfWork 实现决定，不在 handler 的约定内。
namespace Fsso.Notes.Application

open FsToolkit.ErrorHandling
open MediatR
open Fsso.Application
open Fsso.Notes.Domain

module private CreateNote =
    let mapValidation (error: ValidationError) =
        AppError.validation (ValidationError.message error)

type CreateNoteHandler(uow: IUnitOfWork) =
    interface IRequestHandler<CreateNoteCommand, Result<Note, AppError>> with
        // Handle 先完成 Note.create 领域校验；失败时返回 AppError，不会调用 uow.Run 或 store。
        member _.Handle(command, ct) =
            taskResult {
                let! note =
                    Note.create command.Title command.Body
                    |> Result.mapError CreateNote.mapValidation

                return!
                    // uow.Run 的回调 token 由 IUnitOfWork 实现提供，不保证与传入 ct 相同；Insert 接收该 token，handler 返回该调用产生的 Note 结果，提交/回滚与写入计数由具体实现决定。
                    uow.Run
                        (fun scope token ->
                            taskResult {
                                let store = scope.Store<INoteStore>()
                                let! inserted = store.Insert(note, token)
                                return inserted
                            })
                        ct
            }
