// 文件职责：Db 模块解析空值或缺失的配置为 data/fsso.db 绝对路径，构造 ReadWriteCreate、禁用连接池且私有缓存的 SQLite 连接串，创建父目录并在打开后启用外键与五秒忙等待。
namespace Fsso.Database

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite

module Db =
    let resolvePath (configured: string option) =
        let value =
            match configured with
            | Some path when not (String.IsNullOrWhiteSpace path) -> path
            | _ -> Path.Combine("data", "fsso.db")

        Path.GetFullPath value

    let connectionString (path: string) =
        let builder = SqliteConnectionStringBuilder()
        builder.DataSource <- path
        builder.Mode <- SqliteOpenMode.ReadWriteCreate
        builder.Pooling <- false
        builder.Cache <- SqliteCacheMode.Private
        builder.ConnectionString

    let createDirectory (path: string) =
        match Path.GetDirectoryName path with
        | null -> ()
        | directory when String.IsNullOrWhiteSpace directory -> ()
        | directory -> Directory.CreateDirectory directory |> ignore

    let openConnection (path: string) (ct: CancellationToken) =
        task {
            createDirectory path
            let connection = new SqliteConnection(connectionString path)
            do! connection.OpenAsync(ct)
            use command = connection.CreateCommand()
            command.CommandText <- "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"
            let! _ = command.ExecuteNonQueryAsync(ct)
            ()
            return connection
        }
