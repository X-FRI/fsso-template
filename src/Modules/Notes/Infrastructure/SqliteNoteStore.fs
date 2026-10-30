// 文件职责：SqliteNoteStore 使用 QueryContext 与 markWrite 在 main.notes 与 Note 间转换 UTC 时间，实现按 NoteId 查询及插入后返回内存实体；构造参数中的 SqliteTransaction 未被直接引用，事务由工作单元挂到 QueryContext，写操作通过 markWrite 参与跨模块提交。
namespace Fsso.Notes.Infrastructure

open System
open System.Globalization
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open SqlHydra.Query
open Fsso.Database
open Fsso.Database.Generated
open Fsso.Notes.Application
open Fsso.Notes.Domain

type SqliteNoteStore(context: QueryContext, transaction: SqliteTransaction, markWrite: unit -> unit) =
    // toDomain 按 RoundtripKind 解析时间并统一转 UTC，保证领域 Note 不携带本地时区。
    static member private toDomain (row: Generated.main.notes) : Note =
        let parse (value: string) =
            DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind)
            |> fun parsed -> parsed.ToUniversalTime()

        Note.reconstitute
            (NoteId.create (Guid.Parse row.id))
            row.title
            row.body
            (parse row.created_at)

    // toRow 用 O 格式写入时间，与 toDomain 形成稳定的 UTC 往返。
    static member private toRow (note: Note) : Generated.main.notes =
        { id = NoteId.toString note.Id
          title = note.Title
          body = note.Body
          created_at = note.CreatedAt.ToString("O", CultureInfo.InvariantCulture) }

    interface INoteStore with
        member _.FindById(id, ct) =
            task {
                let! row =
                    select {
                        for note in Tables.Note do
                        where (note.id = NoteId.toString id)
                        select note
                    }
                    |> fun query -> context.SelectOneAsyncWithOptions(query, ct)

                return row |> Option.map SqliteNoteStore.toDomain
            }

        // Insert 在当前事务中写入并返回领域对象，成功时必须标记写入以参与跨模块提交。
        member _.Insert(note, ct) =
            task {
                let! _ =
                    insert {
                        into Tables.Note
                        entity (SqliteNoteStore.toRow note)
                    }
                    |> fun query -> context.InsertAsyncWithOptions(query, ct)

                // 写入成功后调用 markWrite，使共享工作单元提交包含 Notes 的变更。
                markWrite ()
                return note
            }

module NoteStoreRegistration =
    let create (context: QueryContext) (transaction: SqliteTransaction) (markWrite: unit -> unit) : obj =
        (SqliteNoteStore(context, transaction, markWrite) :> obj)
