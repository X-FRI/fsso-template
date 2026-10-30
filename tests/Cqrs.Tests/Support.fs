// 文件职责：CQRS 测试共享支撑，定位仓库根、在 artifacts/cqrs 下生成唯一临时数据库并提供显式删库辅助、原生 SQL 计数、HttpClient 与统一错误形状断言，迁移由 Program.buildApp 隐式执行。
module Fsso.Cqrs.Support

open System
open System.IO
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open Fsso.Demo.Api
open Fsso.Host

// 测试共享环境变量与临时库路径，禁用并行以防多个 Host 争用进程级 FSSO_DB_PATH。
[<assembly: Xunit.CollectionBehavior(DisableTestParallelization = true)>]
do ()

let private root =
    let rec find (directory: DirectoryInfo) =
        if isNull directory then failwith "repository root not found"
        elif File.Exists(Path.Combine(directory.FullName, "FssoStack.slnx")) then directory.FullName
        else find directory.Parent

    find (DirectoryInfo AppContext.BaseDirectory)

// 每个用例生成独立 Guid 数据库文件名；宿主生命周期函数不会自动删库，清理需由调用方显式调用 deleteDb。
let newDbPath () =
    let directory = Path.Combine(root, "artifacts", "cqrs")
    Directory.CreateDirectory directory |> ignore
    Path.Combine(directory, sprintf "cqrs-%s.db" (Guid.NewGuid().ToString("N")))

let newTestDir (label: string) =
    let directory =
        Path.Combine(root, "artifacts", "cqrs", sprintf "%s-%s" label (Guid.NewGuid().ToString("N")))

    Directory.CreateDirectory directory |> ignore
    directory

let deleteDb (path: string) =
    for suffix in [ ""; "-shm"; "-wal" ] do
        let candidate = path + suffix
        if File.Exists candidate then File.Delete candidate

// 使用 Pooling=False 的原生连接读取提交状态，确保断言看到磁盘真实数据。
let openConnection (dbPath: string) =
    let connection = new SqliteConnection(sprintf "Data Source=%s;Pooling=False" dbPath)
    connection.Open()
    connection

let countRows (dbPath: string) =
    use connection = openConnection dbPath
    use command = connection.CreateCommand()
    command.CommandText <- "SELECT COUNT(*) FROM demos;"
    Convert.ToInt64(command.ExecuteScalar())

let private jsonOptions =
    JsonSerializerOptions(PropertyNameCaseInsensitive = true)

// 在 127.0.0.1:0 随机端口启动真实 Host，并在 finally 中停止释放，防止端口和进程泄漏。
let withAppOnDb (dbPath: string) (faultEnabled: bool) (test: HttpClient -> string -> Task) =
    task {
        Environment.SetEnvironmentVariable("FSSO_DB_PATH", dbPath)
        Environment.SetEnvironmentVariable("FSSO_FAULT_INJECTION", if faultEnabled then "1" else "0")
        let app = Program.buildApp [||]
        app.Urls.Clear()
        app.Urls.Add("http://127.0.0.1:0")
        do! app.StartAsync()

        try
            let address = app.Urls |> Seq.head
            use client = new HttpClient(BaseAddress = Uri(address), Timeout = TimeSpan.FromSeconds(30.0))
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

let assertErrorShape (status: System.Net.HttpStatusCode) (response: HttpResponseMessage) =
    Xunit.Assert.Equal(status, response.StatusCode)
    Xunit.Assert.StartsWith("application/json", response.Content.Headers.ContentType.MediaType)
    let body = bodyText response
    Xunit.Assert.Equal<string list>([ "code"; "message"; "statusCode"; "traceId" ], propertyNames body)
