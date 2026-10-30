// 文件职责：跨模块事务测试，在同一 SQLite 工作单元内写入 Demo 与 Note，验证成功提交、错误结果、抛出异常和取消四种路径下两张表要么同时存在要么同时清空。
module Fsso.Notes.Tests.TransactionTests

open System
open System.Threading
open System.Threading.Tasks
open Xunit
open Fsso.Application
open Fsso.Composition
open Fsso.Domain
open Fsso.Notes.Application
open Fsso.Notes.Domain
open Fsso.Notes.Tests.Support

let private demo () =
    match Demo.create "Cross module demo" (Some "shared transaction") with
    | Ok value -> value
    | Error error -> failwithf "demo create failed %A" error

let private note () =
    match Note.create "Cross module note" (Some "shared transaction") with
    | Ok value -> value
    | Error error -> failwithf "note create failed %A" error

// 两个 store 从同一作用域取得连接，任何一步失败都由外层工作单元统一回滚。
let private writeBoth (scope: IWorkScope) (ct: CancellationToken) =
    task {
        let demoStore = scope.Store<IDemoStore>()
        let noteStore = scope.Store<INoteStore>()
        let demo = demo ()
        let note = note ()
        let! _ = demoStore.Insert(demo, ct)
        let! inserted = noteStore.Insert(note, ct)
        return demo, inserted
    }

// 提交后用一条 SQL 同时统计两张表的指定主键，确认跨模块写入都可见。
[<Fact>]
let ``CrossModuleCommitWritesDemoAndNote`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let uow = SqliteUnitOfWork db :> IUnitOfWork

            let! result =
                uow.Run
                    (fun scope ct ->
                        task {
                            let! demo, note = writeBoth scope ct
                            return Ok(demo, note)
                        })
                    CancellationToken.None

            match result with
            | Ok(demo, note) ->
                Assert.Equal(1L, countDemos db)
                Assert.Equal(1L, countNotes db)

                use connection = openConnection db
                use command = connection.CreateCommand()
                command.CommandText <-
                    "SELECT (SELECT COUNT(*) FROM demos WHERE id = $demoId), (SELECT COUNT(*) FROM notes WHERE id = $noteId);"

                command.Parameters.AddWithValue("$demoId", DemoId.toString demo.Id) |> ignore
                command.Parameters.AddWithValue("$noteId", NoteId.toString note.Id) |> ignore
                use! reader = command.ExecuteReaderAsync()
                let! hasRow = reader.ReadAsync()
                Assert.True(hasRow)
                Assert.Equal(1L, reader.GetInt64(0))
                Assert.Equal(1L, reader.GetInt64(1))
            | Error error -> failwithf "commit failed %A" error
        finally
            deleteDb db
    }

// 返回 Error 而非抛出异常，验证正常错误路径也回滚已写入的两张表。
[<Fact>]
let ``CrossModuleErrorRollsBackDemoAndNote`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let uow = SqliteUnitOfWork db :> IUnitOfWork

            let! result =
                uow.Run
                    (fun scope ct ->
                        task {
                            let! _ = writeBoth scope ct
                            return Error(AppError.conflict "rollback")
                        })
                    CancellationToken.None

            match result with
            | Error error -> Assert.Equal(Conflict, error.Kind)
            | Ok _ -> failwith "expected error result"

            Assert.Equal(0L, countDemos db)
            Assert.Equal(0L, countNotes db)
        finally
            deleteDb db
    }

// 抛出异常被映射为 Unexpected，同时事务回滚，两张表计数均为零。
[<Fact>]
let ``CrossModuleExceptionRollsBackDemoAndNote`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let uow = SqliteUnitOfWork db :> IUnitOfWork

            let! result =
                uow.Run
                    (fun scope ct ->
                        task {
                            let! _ = writeBoth scope ct
                            return raise (InvalidOperationException("rollback sentinel"))
                        })
                    CancellationToken.None

            match result with
            | Error error -> Assert.Equal(Unexpected, error.Kind)
            | Ok _ -> failwith "expected mapped exception result"

            Assert.Equal(0L, countDemos db)
            Assert.Equal(0L, countNotes db)
        finally
            deleteDb db
    }

// 写入后主动取消并抛出取消异常，确认取消同样触发跨模块回滚。
[<Fact>]
let ``CrossModuleCancellationRollsBackDemoAndNote`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let uow = SqliteUnitOfWork db :> IUnitOfWork
            use cancellation = new CancellationTokenSource()

            let mutable cancelled = false

            try
                let! _ =
                    uow.Run
                        (fun scope ct ->
                            task {
                                let! _ = writeBoth scope ct
                                cancellation.Cancel()
                                ct.ThrowIfCancellationRequested()
                                return Ok()
                            })
                        cancellation.Token

                ()
            with
            | :? OperationCanceledException -> cancelled <- true

            Assert.True(cancelled, "cancellation must rethrow OperationCanceledException")
            Assert.Equal(0L, countDemos db)
            Assert.Equal(0L, countNotes db)
        finally
            deleteDb db
    }
