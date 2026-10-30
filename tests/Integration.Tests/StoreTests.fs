// 文件职责：SQLite 存储与事务集成测试，覆盖跨连接读写、相同时间戳的分页排序、唯一约束、只读不写、迁移幂等、创建与删除在错误或异常后的回滚、仅创建路径的取消回滚和重启持久化。
module Fsso.Integration.StoreTests

open System
open System.Net
open System.Net.Http
open System.Text
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open Xunit
open Fsso.Application
open Fsso.Composition
open Fsso.Database
open Fsso.Domain
open Fsso.Integration.Support

[<Fact>]
let ``CreateAndList persists across connections`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let created = (sender db noFault).Send(({ Name = "Alpha"; Description = Some "first" }: CreateDemoCommand), CancellationToken.None) |> fun work -> work.Result
            let demo =
                match created with
                | Ok value -> value
                | Error error -> failwithf "create failed %A" error

            let listed = (sender db noFault).Send(({ Page = 1; Limit = 10 }: ListDemosQuery), CancellationToken.None) |> fun work -> work.Result

            match listed with
            | Ok paged ->
                Assert.Equal(1L, paged.Total)
                Assert.Equal(demo.Id, paged.Items.Head.Id)
                Assert.Equal(Some "first", paged.Items.Head.Description)
            | Error error -> failwithf "list failed %A" error
        finally
            deleteDb db
    }

// 五条记录共享同一时间戳，排序只能依赖 id DESC，因此页一是 5、4，页三是 1。
[<Fact>]
let ``PaginationDeterministic uses id DESC for equal timestamps`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let stamp = "2026-01-01T00:00:00.0000000Z"

            for index in 1..5 do
                directInsert db (sprintf "00000000-0000-0000-0000-%012d" index) (sprintf "Demo %d" index) stamp

            let list page limit =
                (sender db noFault).Send(({ Page = page; Limit = limit }: ListDemosQuery), CancellationToken.None) |> fun work -> work.Result

            match list 1 2 with
            | Ok first ->
                Assert.Equal(5L, first.Total)
                Assert.Equal([ "00000000-0000-0000-0000-000000000005"; "00000000-0000-0000-0000-000000000004" ], first.Items |> List.map (fun demo -> DemoId.toString demo.Id))
            | Error error -> failwithf "page 1 failed %A" error

            match list 3 2 with
            | Ok last ->
                Assert.Equal(5L, last.Total)
                Assert.Equal([ "00000000-0000-0000-0000-000000000001" ], last.Items |> List.map (fun demo -> DemoId.toString demo.Id))
            | Error error -> failwithf "page 3 failed %A" error

            match list 4 2 with
            | Ok empty -> Assert.Empty(empty.Items)
            | Error error -> failwithf "page 4 failed %A" error

            match list 1 10 with
            | Ok all -> Assert.Equal(5, all.Items.Length)
            | Error error -> failwithf "large limit failed %A" error
        finally
            deleteDb db
    }

// 第二次创建大小写不同的 Foo 应命中 NOCASE 唯一索引并映射为 conflict。
[<Fact>]
let ``CaseInsensitiveUnique maps duplicate names to conflict and SQLite enforces it`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            let first = (sender db noFault).Send(({ Name = "Foo"; Description = None }: CreateDemoCommand), CancellationToken.None) |> fun work -> work.Result

            match first with
            | Ok _ -> ()
            | Error error -> failwithf "first create failed %A" error

            let second = (sender db noFault).Send(({ Name = "foo"; Description = None }: CreateDemoCommand), CancellationToken.None) |> fun work -> work.Result

            match second with
            | Error error ->
                Assert.Equal(Conflict, error.Kind)
                Assert.Equal("conflict", error.Code)
            | Ok _ -> failwith "expected conflict"

            // 绕过应用层直接插入重复名称，确认数据库自身仍以约束拒绝，而不是只靠 handler 检查。
            use connection = openConnection db
            use command = connection.CreateCommand()
            command.CommandText <-
                "INSERT INTO demos (id, name, description, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000099', 'FOO', NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');"

            let raised =
                try
                    command.ExecuteNonQuery() |> ignore
                    false
                with
                | :? SqliteException as ex -> ex.SqliteErrorCode = 19 || ex.SqliteExtendedErrorCode = 2067

            Assert.True(raised, "direct duplicate insert must fail on the unique constraint")
            Assert.Equal(1L, countRows db)
        finally
            deleteDb db
    }

[<Fact>]
let ``ReadDoesNotWrite leaves data version and rows unchanged`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            directInsert db "00000000-0000-0000-0000-000000000001" "ReadOnly" "2026-01-01T00:00:00.0000000Z"
            // 读取前后比较另一连接的 PRAGMA data_version 与行数，证明 GET 和列表没有隐式写入。
            use observer = openConnection db
            use version = observer.CreateCommand()
            version.CommandText <- "PRAGMA data_version;"
            let before = Convert.ToInt64(version.ExecuteScalar())

            let getResult =
                (sender db noFault).Send(({ Id = DemoId.create (Guid.Parse "00000000-0000-0000-0000-000000000001") }: GetDemoQuery), CancellationToken.None)
                |> fun work -> work.Result

            let listResult =
                (sender db noFault).Send(({ Page = 1; Limit = 10 }: ListDemosQuery), CancellationToken.None) |> fun work -> work.Result

            match getResult, listResult with
            | Ok _, Ok _ -> ()
            | _ -> failwith "reads failed"

            let after = Convert.ToInt64(version.ExecuteScalar())
            Assert.Equal(before, after)
            Assert.Equal(1L, countRows db)
        finally
            deleteDb db
    }

// 连续执行两次迁移，历史表应只记录两个版本各一次，验证幂等。
[<Fact>]
let ``MigrationIdempotent records each version exactly once`` () =
    task {
        let db = newDbPath ()
        try
            migrate db
            migrate db
            let versions = Migrations.appliedVersions db CancellationToken.None |> fun work -> work.Result
            Assert.Equal<string list>([ "001_create_demos"; "002_index_demos_created" ], versions)
        finally
            deleteDb db
    }

// 回滚辅助在事务内确认删除后行不可见或插入后行可见，再返回错误或抛出异常，最后从外部连接确认删除被恢复或插入被清空。
let private runRollback (db: string) (delete: bool) (mode: string) =
    migrate db
    let fault = errorInjector "none"

    match delete with
    | false ->
        let demo =
            match (sender db fault).Send(({ Name = "Rollback"; Description = None }: CreateDemoCommand), CancellationToken.None) |> fun work -> work.Result with
            | Ok value -> value
            | Error error -> failwithf "seed failed %A" error

        let uow = SqliteUnitOfWork db :> IUnitOfWork

        let result =
            uow.Run
                (fun scope ct ->
                    task {
                        let store = scope.Store<IDemoStore>()
                        do! store.Delete(demo.Id, ct)
                        let! inside = store.FindById(demo.Id, ct)
                        Assert.True(inside.IsNone, "row must be absent inside the transaction")

                        match mode with
                        | "error" -> return Error(AppError.conflict "rollback")
                        | _ -> return raise (InvalidOperationException("rollback sentinel"))
                    })
                CancellationToken.None
            |> fun work -> work.Result

        match mode, result with
        | "error", Error error -> Assert.Equal(Conflict, error.Kind)
        | "error", Ok _ -> failwith "expected error"
        | _, Error error -> Assert.Equal(Unexpected, error.Kind)
        | _, Ok _ -> failwith "expected exception mapping"

        // 事务外重新查询同一标识，删除必须被回滚而记录重新出现。
        let outside = (sender db fault).Send(({ Id = demo.Id }: GetDemoQuery), CancellationToken.None) |> fun work -> work.Result

        match outside with
        | Ok restored -> Assert.Equal("Rollback", restored.Name)
        | Error error -> failwithf "row must be restored: %A" error
    | true ->
        let demo = Demo.reconstitute (DemoId.newId ()) "WillRollback" None DateTime.UtcNow DateTime.UtcNow
        let uow = SqliteUnitOfWork db :> IUnitOfWork

        let result =
            uow.Run
                (fun scope ct ->
                    task {
                        let store = scope.Store<IDemoStore>()
                        let! inserted = store.Insert(demo, ct)
                        match inserted with
                        | Error error -> return Error error
                        | Ok() ->
                            let! inside = store.FindById(demo.Id, ct)
                            Assert.True(inside.IsSome, "row must be present inside the transaction")

                            match mode with
                            | "error" -> return Error(AppError.conflict "rollback")
                            | _ -> return raise (InvalidOperationException("rollback sentinel"))
                    })
                CancellationToken.None
            |> fun work -> work.Result

        match mode, result with
        | "error", Error error -> Assert.Equal(Conflict, error.Kind)
        | "error", Ok _ -> failwith "expected error"
        | _, Error error -> Assert.Equal(Unexpected, error.Kind)
        | _, Ok _ -> failwith "expected exception mapping"

        // 创建分支在事务外直接计数，插入必须被回滚为零行。
        Assert.Equal(0L, countRows db)

[<Fact>]
let ``CreateRollbackError removes row written inside the transaction`` () =
    task {
        let db = newDbPath ()
        try runRollback db true "error" finally deleteDb db
    }

[<Fact>]
let ``CreateRollbackException removes row written inside the transaction`` () =
    task {
        let db = newDbPath ()
        try runRollback db true "throw" finally deleteDb db
    }

[<Fact>]
let ``DeleteRollbackError restores deleted row`` () =
    task {
        let db = newDbPath ()
        try runRollback db false "error" finally deleteDb db
    }

[<Fact>]
let ``DeleteRollbackException restores deleted row`` () =
    task {
        let db = newDbPath ()
        try runRollback db false "throw" finally deleteDb db
    }

// 同一数据库先后启动两个进程内 WebApplication 宿主，第一次写入，第二次读取，验证持久化跨越宿主生命周期而非操作系统进程生命周期。
[<Fact>]
let ``Restart persistence reads row created before restart`` () =
    task {
        let db = newDbPath ()
        try
            let mutable id = ""

            do!
                withAppOnDb db false (fun client _ ->
                    task {
                        let! response = postDemo client "Persisted" "kept"
                        Assert.Equal(HttpStatusCode.Created, response.StatusCode)
                        id <- (readDemo response).Id
                    })

            do!
                withAppOnDb db false (fun client _ ->
                    task {
                        let! response = client.GetAsync(sprintf "/api/demos/%s" id)
                        Assert.Equal(HttpStatusCode.OK, response.StatusCode)
                        Assert.Equal("Persisted", (readDemo response).Name)
                    })
        finally
            deleteDb db
    }

[<Fact>]
let ``Cancellation during delay-before-commit rolls back without 500`` () =
    task {
        let db = newDbPath ()
        try
            do!
                withAppOnDb db true (fun client _ ->
                    task {
                        let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
                        request.Headers.Add("X-Test-Fault", "delay-before-commit")
                        request.Content <-
                            new StringContent("""{"name":"Cancelled","description":null}""", Text.Encoding.UTF8, "application/json")

                        use cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(250.0))

                        let cancelled =
                            try
                                let response = client.SendAsync(request, cancellation.Token).GetAwaiter().GetResult()
                                false, int response.StatusCode
                            with
                            | :? OperationCanceledException -> true, 0

                        let wasCancelled, status = cancelled
                        Assert.True(wasCancelled, sprintf "expected cancellation, got status %d" status)
                    })

            // 延迟提交故障留出取消窗口，客户端应看到取消而非 500，随后轮询确认行未落库。
            let mutable attempts = 0
            while countRows db <> 0L && attempts < 20 do
                attempts <- attempts + 1
                do! Task.Delay 100
            Assert.Equal(0L, countRows db)
        finally
            deleteDb db
    }

// 创建路径同时验证错误注入 409 与异常注入 500 均不留下行，删除路径只覆盖 409 错误注入后记录仍可读。
[<Fact>]
let ``FaultInjection rollback modes return 409 and 500 without persisting`` () =
    task {
        let db = newDbPath ()
        try
            do!
                withAppOnDb db true (fun client _ ->
                    task {
                        let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
                        request.Headers.Add("X-Test-Fault", "error-after-write")
                        request.Content <- new StringContent("""{"name":"ErrorFault"}""", Text.Encoding.UTF8, "application/json")
                        let! errorResponse = client.SendAsync(request)
                        Assert.Equal(HttpStatusCode.Conflict, errorResponse.StatusCode)

                        let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
                        request.Headers.Add("X-Test-Fault", "throw-after-write")
                        request.Content <- new StringContent("""{"name":"ThrowFault"}""", Text.Encoding.UTF8, "application/json")
                        let! throwResponse = client.SendAsync(request)
                        Assert.Equal(HttpStatusCode.InternalServerError, throwResponse.StatusCode)
                        let body = bodyText throwResponse
                        Assert.DoesNotContain("Injected failure", body)
                        Assert.DoesNotContain("InvalidOperationException", body)
                    })

            Assert.Equal(0L, countRows db)

            do!
                withAppOnDb db true (fun client _ ->
                    task {
                        let! created = postDemo client "DeleteFault" "x"
                        let id = (readDemo created).Id
                        let request = new HttpRequestMessage(HttpMethod.Delete, sprintf "/api/demos/%s" id)
                        request.Headers.Add("X-Test-Fault", "error-after-write")
                        let! response = client.SendAsync(request)
                        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode)

                        let! read = client.GetAsync(sprintf "/api/demos/%s" id)
                        Assert.Equal(HttpStatusCode.OK, read.StatusCode)
                    })
        finally
            deleteDb db
    }

[<Fact>]
let ``Fault header is ignored when injection is disabled`` () =
    task {
        let db = newDbPath ()
        try
            do!
                withAppOnDb db false (fun client _ ->
                    task {
                        let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
                        request.Headers.Add("X-Test-Fault", "throw-after-write")
                        request.Content <- new StringContent("""{"name":"Ignored"}""", Text.Encoding.UTF8, "application/json")
                        let! response = client.SendAsync(request)
                        Assert.Equal(HttpStatusCode.Created, response.StatusCode)
                    })
        finally
            deleteDb db
    }
