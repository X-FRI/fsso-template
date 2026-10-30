// 文件职责：Notes 测试共享夹具，组合 Demo 与 Notes 迁移创建隔离数据库，提供按表计数、Notes 与 Demo 的 HTTP 提交读取以及统一错误形状断言供各用例复用。
module Fsso.Notes.Tests.Support

open System
open System.IO
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open Fsso.Composition
open Fsso.Database
open Fsso.Demo.Api
open Fsso.Infrastructure
open Fsso.Notes.Api
open Fsso.Notes.Infrastructure

[<assembly: Xunit.CollectionBehavior(DisableTestParallelization = true)>]
do ()

let private root =
    let rec find (directory: DirectoryInfo) =
        if isNull directory then failwith "repository root not found"
        elif File.Exists(Path.Combine(directory.FullName, "FssoStack.slnx")) then directory.FullName
        else find directory.Parent

    find (DirectoryInfo AppContext.BaseDirectory)

let jsonOptions =
    JsonSerializerOptions(PropertyNameCaseInsensitive = true)

let artifactsPath (name: string) =
    let directory = Path.Combine(root, "artifacts", "notes")
    Directory.CreateDirectory directory |> ignore
    Path.Combine(directory, name)

let newDbPath () =
    artifactsPath (sprintf "test-%s.db" (Guid.NewGuid().ToString("N")))

let deleteDb (path: string) =
    for suffix in [ ""; "-shm"; "-wal" ] do
        let candidate = path + suffix
        if File.Exists candidate then File.Delete candidate

// 合并 Demo 与 Notes 迁移，验证共享迁移执行器按版本顺序建立两模块表。
let migrate (dbPath: string) =
    Migrations.apply dbPath (DemoMigrations.all @ NotesMigrations.all) CancellationToken.None
    |> fun work -> work.GetAwaiter().GetResult()

let openConnection (dbPath: string) =
    let connection = new SqliteConnection(sprintf "Data Source=%s;Pooling=False" dbPath)
    connection.Open()
    connection

let countRows (dbPath: string) (table: string) =
    use connection = openConnection dbPath
    use command = connection.CreateCommand()
    command.CommandText <- sprintf "SELECT COUNT(*) FROM %s;" table
    Convert.ToInt64(command.ExecuteScalar())

// 直接按表计数用于事务回滚断言，绕过 HTTP 层确认两张表同时清空或同时存在。
let countNotes (dbPath: string) = countRows dbPath "notes"

let countDemos (dbPath: string) = countRows dbPath "demos"

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

let postNote (client: HttpClient) (title: string) (body: string) =
    let json =
        JsonSerializer.Serialize({| title = title; body = body |})

    postJson client "/api/notes" json

let postDemo (client: HttpClient) (name: string) (description: string) =
    let json =
        JsonSerializer.Serialize({| name = name; description = description |})

    postJson client "/api/demos" json

let readNote (response: HttpResponseMessage) =
    let body = response.Content.ReadAsStringAsync().Result
    JsonSerializer.Deserialize<NoteResponse>(body, jsonOptions)

let readDemo (response: HttpResponseMessage) =
    let body = response.Content.ReadAsStringAsync().Result
    JsonSerializer.Deserialize<DemoResponse>(body, jsonOptions)

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
