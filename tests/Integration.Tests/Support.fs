// 文件职责：Demo 集成测试共享夹具，负责 artifacts/integration 唯一临时库、迁移与直插、故障注入器、服务容器和真实 HTTP 宿主生命周期，保证每个用例互不共享状态。
module Fsso.Integration.Support

open System
open System.IO
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open Microsoft.Extensions.DependencyInjection
open MediatR
open Fsso.Application
open Fsso.Composition
open Fsso.Database
open Fsso.Demo.Api
open Fsso.Domain
open Fsso.Infrastructure

// Host 与数据库路径通过环境变量共享，禁用并行避免用例互相覆盖进程级设置。
[<assembly: Xunit.CollectionBehavior(DisableTestParallelization = true)>]
do ()

let private root =
    let rec find (directory: DirectoryInfo) =
        if isNull directory then failwith "repository root not found"
        elif File.Exists(Path.Combine(directory.FullName, "FssoStack.slnx")) then directory.FullName
        else find directory.Parent

    find (DirectoryInfo AppContext.BaseDirectory)

let jsonOptions =
    let options = JsonSerializerOptions(PropertyNameCaseInsensitive = true)
    options

let artifactsPath (name: string) =
    let directory = Path.Combine(root, "artifacts", "integration")
    Directory.CreateDirectory directory |> ignore
    Path.Combine(directory, name)

// 集成库统一落在 artifacts/integration 并使用随机文件名；宿主与 withApp 不自动删除，随机新文件本身保证全新空 schema。
let newDbPath () =
    artifactsPath (sprintf "test-%s.db" (Guid.NewGuid().ToString("N")))

let deleteDb (path: string) =
    for suffix in [ ""; "-shm"; "-wal" ] do
        let candidate = path + suffix
        if File.Exists candidate then File.Delete candidate

// 先应用全部 Demo 迁移，让直插和 handler 都面对真实的表、索引与唯一约束。
let migrate (dbPath: string) =
    Migrations.apply dbPath DemoMigrations.all CancellationToken.None |> fun work -> work.GetAwaiter().GetResult()

let openConnection (dbPath: string) =
    let connection = new SqliteConnection(sprintf "Data Source=%s;Pooling=False" dbPath)
    connection.Open()
    connection

let countRows (dbPath: string) =
    use connection = openConnection dbPath
    use command = connection.CreateCommand()
    command.CommandText <- "SELECT COUNT(*) FROM demos;"
    Convert.ToInt64(command.ExecuteScalar())

// 绕过 store 直接写入指定时间戳，用于构造分页排序和只读场景的确定性数据。
let directInsert (dbPath: string) (id: string) (name: string) (createdAt: string) =
    use connection = openConnection dbPath
    use command = connection.CreateCommand()
    command.CommandText <-
        "INSERT INTO demos (id, name, description, created_at, updated_at) VALUES ($id, $name, NULL, $createdAt, $createdAt);"

    command.Parameters.AddWithValue("$id", id) |> ignore
    command.Parameters.AddWithValue("$name", name) |> ignore
    command.Parameters.AddWithValue("$createdAt", createdAt) |> ignore
    command.ExecuteNonQuery() |> ignore

// error 返回 AppError 触发正常错误回滚，throw 抛出异常触发异常映射回滚。
let errorInjector (mode: string) =
    { new IFaultInjector with
        member _.AfterWrite(_) =
            match mode with
            | "error" -> Task.FromResult(Error(AppError.conflict "Injected failure after write."))
            | "throw" -> raise (InvalidOperationException("Injected failure after write."))
            | _ -> Task.FromResult(Ok()) }

let noFault = errorInjector "none"

let sender (dbPath: string) (fault: IFaultInjector) =
    let services = ServiceCollection()
    services.AddSingleton<IUnitOfWork>(SqliteUnitOfWork(dbPath) :> IUnitOfWork) |> ignore
    services.AddSingleton<IFaultInjector>(fault) |> ignore
    services.AddMediatR(
        System.Action<MediatRServiceConfiguration>(fun config ->
            config.RegisterServicesFromAssembly(typeof<CreateDemoCommand>.Assembly) |> ignore))
    |> ignore
    services.BuildServiceProvider().GetRequiredService<ISender>()

// 随机端口启动真实 Kestrel，环境变量决定故障注入开关，finally 保证宿主停止。
let withAppOnDb (dbPath: string) (faultEnabled: bool) (test: HttpClient -> string -> Task) =
    task {
        Environment.SetEnvironmentVariable("FSSO_DB_PATH", dbPath)
        Environment.SetEnvironmentVariable("FSSO_FAULT_INJECTION", if faultEnabled then "1" else "0")
        let app = Fsso.Host.Program.buildApp [||]
        app.Urls.Clear()
        app.Urls.Add("http://127.0.0.1:0")
        do! app.StartAsync()

        try
            let address = app.Urls |> Seq.head
            use client = new HttpClient(BaseAddress = Uri(address), Timeout = TimeSpan.FromSeconds(20.0))
            do! test client dbPath
        finally
            app.StopAsync().GetAwaiter().GetResult()
            app.DisposeAsync().AsTask().GetAwaiter().GetResult()
    }

let withApp (test: HttpClient -> string -> Task) = withAppOnDb (newDbPath ()) false test

let postJson (client: HttpClient) (path: string) (json: string) =
    let content = new StringContent(json, Encoding.UTF8, "application/json")
    client.PostAsync(path, content)

let postDemo (client: HttpClient) (name: string) (description: string) =
    let json =
        JsonSerializer.Serialize({| name = name; description = description |})

    postJson client "/api/demos" json

let readDemo (response: HttpResponseMessage) =
    let body = response.Content.ReadAsStringAsync().Result
    JsonSerializer.Deserialize<DemoResponse>(body, jsonOptions)

let readPaged (response: HttpResponseMessage) =
    let body = response.Content.ReadAsStringAsync().Result
    JsonSerializer.Deserialize<PagedDemoResponse>(body, jsonOptions)

let bodyText (response: HttpResponseMessage) =
    response.Content.ReadAsStringAsync().Result

let propertyNames (body: string) =
    use document = JsonDocument.Parse body
    document.RootElement.EnumerateObject()
    |> Seq.map (fun property -> property.Name)
    |> Seq.sort
    |> List.ofSeq
