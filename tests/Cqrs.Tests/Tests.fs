// 文件职责：CQRS 与宿主启动测试，验证每个命令查询恰好一个 handler、缺失注册快速失败、领域错误到 HTTP 状态映射、故障回滚、取消、并发唯一写入以及旧默认库路径绝不创建或改写。
module Fsso.Cqrs.Tests

open System
open System.Diagnostics
open System.IO
open System.Net
open System.Net.Http
open System.Security.Cryptography
open System.Text
open System.Threading
open System.Threading.Tasks
open Microsoft.Extensions.DependencyInjection
open MediatR
open Xunit
open Fsso.Application
open Fsso.Domain
open Fsso.Host
open Fsso.Cqrs.Support

let private withHostServices (test: IServiceProvider -> string -> Task) =
    task {
        let db = newDbPath ()
        Environment.SetEnvironmentVariable("FSSO_DB_PATH", db)
        Environment.SetEnvironmentVariable("FSSO_FAULT_INJECTION", "0")
        let app = Program.buildApp [||]

        try
            do! test app.Services db
        finally
            app.DisposeAsync().AsTask().GetAwaiter().GetResult()
            deleteDb db
    }

[<Fact>]
let ``HandlerSelection resolves exactly one handler and dispatches all four messages`` () =
    withHostServices (fun services db ->
        task {
            let sender = services.GetRequiredService<ISender>()
            let createHandlers = services.GetServices<IRequestHandler<CreateDemoCommand, Result<Demo, AppError>>>() |> Seq.length
            let getHandlers = services.GetServices<IRequestHandler<GetDemoQuery, Result<Demo, AppError>>>() |> Seq.length
            let listHandlers = services.GetServices<IRequestHandler<ListDemosQuery, Result<PagedDemos, AppError>>>() |> Seq.length
            let deleteHandlers = services.GetServices<IRequestHandler<DeleteDemoCommand, Result<unit, AppError>>>() |> Seq.length

            Assert.Equal(1, createHandlers)
            Assert.Equal(1, getHandlers)
            Assert.Equal(1, listHandlers)
            Assert.Equal(1, deleteHandlers)

            let! created = sender.Send(({ Name = "CQRS"; Description = Some "selected" }: CreateDemoCommand), CancellationToken.None)

            let demo =
                match created with
                | Ok value -> value
                | Error error -> failwithf "create failed %A" error

            let! fetched = sender.Send(({ Id = demo.Id }: GetDemoQuery), CancellationToken.None)
            let! listed = sender.Send(({ Page = 1; Limit = 10 }: ListDemosQuery), CancellationToken.None)
            let! deleted = sender.Send(({ Id = demo.Id }: DeleteDemoCommand), CancellationToken.None)

            match fetched, listed, deleted with
            | Ok value, Ok page, Ok() ->
                Assert.Equal("CQRS", value.Name)
                Assert.Equal(1L, page.Total)
                Assert.Equal(1, page.Items.Length)
            | _ -> failwith "one or more dispatches failed"

            Assert.Equal(0L, countRows db)
        })

// 不注册 Application handler，确认容器直接抛出缺少 IRequestHandler 而不是回退到假处理器。
[<Fact>]
let ``MissingRegistration fails clearly without a fallback handler`` () =
    let services = ServiceCollection()

    services.AddMediatR(
        System.Action<MediatRServiceConfiguration>(fun config ->
            config.RegisterServicesFromAssembly(typeof<Demo>.Assembly) |> ignore))
    |> ignore

    use provider = services.BuildServiceProvider()
    let sender = provider.GetRequiredService<ISender>()
    let mutable failure: exn = null

    try
        sender.Send(({ Name = "No handler"; Description = None }: CreateDemoCommand), CancellationToken.None)
        |> fun work -> work.GetAwaiter().GetResult()
        |> ignore
    with error ->
        failure <- error

    Assert.NotNull(failure)
    Assert.Contains("IRequestHandler", failure.Message)

[<Fact>]
let ``DomainErrorsMapToExpectedHttpStatus`` () =
    withApp (fun client _ ->
        task {
            let! emptyName = postJson client "/api/demos" """{"name":"   "}"""
            assertErrorShape HttpStatusCode.BadRequest emptyName

            let! badId = client.GetAsync("/api/demos/not-a-guid")
            assertErrorShape HttpStatusCode.BadRequest badId

            let! missing = client.GetAsync(sprintf "/api/demos/%s" (Guid.NewGuid().ToString("D")))
            assertErrorShape HttpStatusCode.NotFound missing

            let! first = postDemo client "Case" "one"
            Assert.Equal(HttpStatusCode.Created, first.StatusCode)
            let! duplicate = postDemo client "case" "two"
            assertErrorShape HttpStatusCode.Conflict duplicate
        })

// 故障注入开启后错误结果必须在提交前回滚，因此客户端得到冲突且行数保持为零。
[<Fact>]
let ``InjectedErrorRollsBackAndLeavesNoRow`` () =
    withAppOnDb (newDbPath ()) true (fun client db ->
        task {
            let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
            request.Headers.Add("X-Test-Fault", "error-after-write")
            request.Content <- new StringContent("""{"name":"Injected Error"}""", Encoding.UTF8, "application/json")
            let! response = client.SendAsync(request)
            assertErrorShape HttpStatusCode.Conflict response
            Assert.Equal(0L, countRows db)
        })

[<Fact>]
let ``InjectedExceptionRollsBackAndLeavesNoRow`` () =
    withAppOnDb (newDbPath ()) true (fun client db ->
        task {
            let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
            request.Headers.Add("X-Test-Fault", "throw-after-write")
            request.Content <- new StringContent("""{"name":"Injected Exception"}""", Encoding.UTF8, "application/json")
            let! response = client.SendAsync(request)
            assertErrorShape HttpStatusCode.InternalServerError response
            Assert.Equal(0L, countRows db)
        })

// 预先取消的令牌应原样抛出 OperationCanceledException，而不是被包装成 500。
[<Fact>]
let ``PreCanceledSendRollsBackAndRethrows`` () =
    withHostServices (fun services db ->
        task {
            let sender = services.GetRequiredService<ISender>()
            use cancellation = new CancellationTokenSource()
            cancellation.Cancel()
            let mutable canceled = false

            try
                sender.Send(({ Name = "Pre canceled"; Description = None }: CreateDemoCommand), cancellation.Token)
                |> fun work -> work.GetAwaiter().GetResult()
                |> ignore
            with
            | :? OperationCanceledException -> canceled <- true

            Assert.True(canceled, "pre-canceled Send must rethrow OperationCanceledException")
            Assert.Equal(0L, countRows db)
        })

[<Fact>]
let ``DelayedCancellationRollsBackAndRethrowsWithoutRow`` () =
    withAppOnDb (newDbPath ()) true (fun client db ->
        task {
            let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
            request.Headers.Add("X-Test-Fault", "delay-before-commit")
            request.Content <- new StringContent("""{"name":"Cancelled CQRS","description":null}""", Encoding.UTF8, "application/json")
            use cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(250.0))

            let mutable canceled = false

            try
                let! _ = client.SendAsync(request, cancellation.Token)
                ()
            with
            | :? OperationCanceledException -> canceled <- true

            Assert.True(canceled, "client cancellation must propagate as OperationCanceledException")

            let mutable attempts = 0
            while countRows db <> 0L && attempts < 30 do
                attempts <- attempts + 1
                do! Task.Delay 100
            Assert.Equal(0L, countRows db)
        })

[<Fact>]
let ``ConcurrentUniqueCreatesAllSucceedAndListExactlyN`` () =
    let count = 8

    withApp (fun client _ ->
        task {
            let requests =
                [| for index in 1..count ->
                    postDemo client (sprintf "Concurrent demo %d" index) "parallel" |]

            let! responses = Task.WhenAll requests
            Assert.All(responses, fun response -> Assert.Equal(HttpStatusCode.Created, response.StatusCode))

            let! listed = client.GetAsync("/api/demos?page=1&limit=100")
            Assert.Equal(HttpStatusCode.OK, listed.StatusCode)
            let paged = readPaged listed
            Assert.Equal(int64 count, paged.Total)
            Assert.Equal(count, paged.Data.Length)
        })

[<Fact>]
let ``ConcurrentSameIdDeletesYieldOneSuccessAndRest404`` () =
    withApp (fun client _ ->
        task {
            let! created = postDemo client "Delete race" "one"
            Assert.Equal(HttpStatusCode.Created, created.StatusCode)
            let id = (readDemo created).Id

            let requests =
                [| for _ in 1..8 ->
                    client.DeleteAsync(sprintf "/api/demos/%s" id) |]

            let! responses = Task.WhenAll requests
            let success = responses |> Array.filter (fun response -> response.StatusCode = HttpStatusCode.NoContent) |> Array.length
            let missing = responses |> Array.filter (fun response -> response.StatusCode = HttpStatusCode.NotFound) |> Array.length
            let failures = responses |> Array.filter (fun response -> int response.StatusCode >= 500) |> Array.length

            Assert.Equal(1, success)
            Assert.Equal(7, missing)
            Assert.Equal(0, failures)
        })


let private legacyPath (directory: string) =
    Path.Combine(directory, "data", String.Concat("clin", "wise", ".db"))

let private sha256File (path: string) =
    use stream = File.OpenRead path
    use sha = SHA256.Create()
    Convert.ToHexString(sha.ComputeHash(stream))

let private withEnvironmentAndCwd (directory: string) (configured: string) (test: unit -> Task) =
    task {
        let originalCwd = Directory.GetCurrentDirectory()
        let originalDb = Environment.GetEnvironmentVariable "FSSO_DB_PATH"

        try
            Directory.SetCurrentDirectory directory
            Environment.SetEnvironmentVariable("FSSO_DB_PATH", configured)
            do! test ()
        finally
            Environment.SetEnvironmentVariable("FSSO_DB_PATH", originalDb)
            Directory.SetCurrentDirectory originalCwd
    }

// 旧默认库只读校验：失败启动前后比较哈希与修改时间，证明既未创建也未移动或删除旧文件。
[<Fact>]
let ``LegacyDefaultPresentEnvUnsetFailsBeforeAnyDbCreation`` () =
    task {
        let directory = newTestDir "legacy-fail"
        let dataDirectory = Path.Combine(directory, "data")
        Directory.CreateDirectory dataDirectory |> ignore
        let legacy = legacyPath directory
        File.WriteAllText(legacy, "legacy-sentinel")
        let hashBefore = sha256File legacy
        let mtimeBefore = File.GetLastWriteTimeUtc legacy

        try
            do!
                withEnvironmentAndCwd directory null (fun () ->
                    task {
                        let failure =
                            Assert.Throws<InvalidOperationException>(fun () ->
                                Program.buildApp [||] |> ignore)

                        Assert.Contains("FSSO_DB_PATH", failure.Message)
                        Assert.Contains("not opened, moved, or deleted", failure.Message)
                        Assert.False(File.Exists(Path.Combine(dataDirectory, "fsso.db")))
                        Assert.Equal(1, Directory.GetFiles(dataDirectory).Length)
                    })

            Assert.Equal(hashBefore, sha256File legacy)
            Assert.Equal(mtimeBefore, File.GetLastWriteTimeUtc legacy)
        finally
            Directory.Delete(directory, true)
    }

[<Fact>]
let ``ExplicitDbPathStartsAndUsesNewPathWhileLegacyRemainsUnchanged`` () =
    task {
        let directory = newTestDir "legacy-explicit"
        let dataDirectory = Path.Combine(directory, "data")
        Directory.CreateDirectory dataDirectory |> ignore
        let legacy = legacyPath directory
        File.WriteAllText(legacy, "legacy-sentinel")
        let hashBefore = sha256File legacy
        let mtimeBefore = File.GetLastWriteTimeUtc legacy
        let explicitDb = Path.Combine(directory, "chosen", "explicit.db")

        try
            do!
                withEnvironmentAndCwd directory explicitDb (fun () ->
                    withAppOnDb explicitDb false (fun client _ ->
                        task {
                            let! created = postDemo client "Restored explicit" "backup"
                            Assert.Equal(HttpStatusCode.Created, created.StatusCode)
                            let! listed = client.GetAsync("/api/demos?page=1&limit=10")
                            Assert.Equal(HttpStatusCode.OK, listed.StatusCode)
                            Assert.Equal(1L, (readPaged listed).Total)
                            Assert.Equal(1L, countRows explicitDb)
                        }))

            Assert.True(File.Exists explicitDb)
            Assert.True(File.Exists legacy)
            Assert.Equal(hashBefore, sha256File legacy)
            Assert.Equal(mtimeBefore, File.GetLastWriteTimeUtc legacy)
            Assert.False(File.Exists(Path.Combine(dataDirectory, "fsso.db")))
        finally
            Directory.Delete(directory, true)
    }

[<Fact>]
let ``NoLegacyDefaultUsesNewDefaultPath`` () =
    task {
        let directory = newTestDir "no-legacy"

        try
            do!
                withEnvironmentAndCwd directory null (fun () ->
                    task {
                        let app = Program.buildApp [||]

                        try
                            Assert.True(File.Exists(Path.Combine(directory, "data", "fsso.db")))
                        finally
                            app.DisposeAsync().AsTask().GetAwaiter().GetResult()
                    })
        finally
            Directory.Delete(directory, true)
    }


// 通过真实子进程执行 --migrate-only，验证启动前就因缺少显式库路径失败且不产生新数据库。
[<Fact>]
let ``MigrateOnlyLegacyDefaultEnvUnsetFailsBeforeAnyDbCreation`` () =
    task {
        let directory = newTestDir "legacy-migrate-only"
        let dataDirectory = Path.Combine(directory, "data")
        Directory.CreateDirectory dataDirectory |> ignore
        let legacy = legacyPath directory
        File.WriteAllText(legacy, "legacy-sentinel")
        let hashBefore = sha256File legacy
        let mtimeBefore = File.GetLastWriteTimeUtc legacy
        let hostDll = Path.Combine(AppContext.BaseDirectory, "Fsso.Host.dll")
        Assert.True(File.Exists hostDll, sprintf "host DLL not found: %s" hostDll)

        try
            let startInfo = ProcessStartInfo()
            startInfo.FileName <- "dotnet"
            startInfo.ArgumentList.Add hostDll
            startInfo.ArgumentList.Add "--migrate-only"
            startInfo.WorkingDirectory <- directory
            startInfo.RedirectStandardOutput <- true
            startInfo.RedirectStandardError <- true
            startInfo.UseShellExecute <- false
            startInfo.Environment.Remove("FSSO_DB_PATH") |> ignore

            use hostProcess = new Process(StartInfo = startInfo)
            Assert.True(hostProcess.Start(), "failed to start Host --migrate-only")
            let stdout = hostProcess.StandardOutput.ReadToEndAsync()
            let stderr = hostProcess.StandardError.ReadToEndAsync()

            if not (hostProcess.WaitForExit 30_000) then
                hostProcess.Kill true
                failwith "Host --migrate-only timed out"

            let output = stdout.Result + stderr.Result
            Assert.NotEqual(0, hostProcess.ExitCode)
            Assert.Contains("FSSO_DB_PATH", output)
            Assert.False(File.Exists(Path.Combine(dataDirectory, "fsso.db")))
            Assert.Equal(1, Directory.GetFiles(dataDirectory).Length)
            Assert.Equal(hashBefore, sha256File legacy)
            Assert.Equal(mtimeBefore, File.GetLastWriteTimeUtc legacy)
        finally
            Directory.Delete(directory, true)
    }
