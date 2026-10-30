// 文件职责：GetNoteHandler 在 uow.Run 作用域内按 GetNoteQuery 的 NoteId 调用 INoteStore.FindById，命中返回领域 Note，未命中生成 Note not found 的 not_found 错误；该方法只读且不调用写入方法，是否提交或回滚由 IUnitOfWork 实现决定。
namespace Fsso.Notes.Application

open FsToolkit.ErrorHandling
open MediatR
open Fsso.Application
open Fsso.Notes.Domain

type GetNoteHandler(uow: IUnitOfWork) =
    interface IRequestHandler<GetNoteQuery, Result<Note, AppError>> with
        // Handle 是只读查询，未找到时转换为 not_found，不修改数据库。
        member _.Handle(query, ct) =
            // uow.Run 回调收到的 token 由 IUnitOfWork 实现提供，不保证与传入 ct 相同；FindById 使用该回调 token。按当前 SQLite IUnitOfWork 实现，零写入的 Ok 会回滚空事务，这是实现语义而非接口契约。
            uow.Run
                (fun scope token ->
                    taskResult {
                        let store = scope.Store<INoteStore>()
                        let! found = store.FindById(query.Id, token)

                        match found with
                        | Some note -> return note
                        | None -> return! Error(AppError.notFound "Note not found.")
                    })
                ct
