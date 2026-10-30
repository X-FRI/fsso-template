// 文件职责：Migrations.apply 先创建 schema_migrations 历史表，再按版本排序逐个在事务中检查是否已应用，仅对未应用项执行 SQL 并写入 applied_at，最后提交以实现重复启动幂等，appliedVersions 提供只读查询。
namespace Fsso.Database

open System
open System.Threading
open System.Threading.Tasks

type Migration =
    { Version: string
      Sql: string }

module Migrations =
    let apply (dbPath: string) (migrations: Migration list) (ct: CancellationToken) =
        task {
            use! connection = Db.openConnection dbPath ct
            use createHistory = connection.CreateCommand()
            createHistory.CommandText <-
                "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);"

            let! _ = createHistory.ExecuteNonQueryAsync(ct)
            ()

            for migration in migrations |> List.sortBy (fun item -> item.Version) do
                use transaction = connection.BeginTransaction()

                use exists = connection.CreateCommand()
                exists.Transaction <- transaction
                exists.CommandText <- "SELECT COUNT(*) FROM schema_migrations WHERE version = $version;"
                exists.Parameters.AddWithValue("$version", migration.Version) |> ignore
                let! applied = exists.ExecuteScalarAsync(ct)
                let applied = Convert.ToInt64 applied

                if applied = 0L then
                    use migrate = connection.CreateCommand()
                    migrate.Transaction <- transaction
                    migrate.CommandText <- migration.Sql
                    let! _ = migrate.ExecuteNonQueryAsync(ct)
                    ()

                    use record = connection.CreateCommand()
                    record.Transaction <- transaction
                    record.CommandText <-
                        "INSERT INTO schema_migrations (version, applied_at) VALUES ($version, $appliedAt);"

                    record.Parameters.AddWithValue("$version", migration.Version) |> ignore
                    record.Parameters.AddWithValue("$appliedAt", DateTime.UtcNow.ToString("O")) |> ignore
                    let! _ = record.ExecuteNonQueryAsync(ct)
                    ()

                do! transaction.CommitAsync(ct)
        }
        :> Task

    let appliedVersions (dbPath: string) (ct: CancellationToken) =
        task {
            use! connection = Db.openConnection dbPath ct
            use command = connection.CreateCommand()
            command.CommandText <- "SELECT version FROM schema_migrations ORDER BY version;"
            use! reader = command.ExecuteReaderAsync(ct)
            let versions = ResizeArray<string>()
            let mutable reading = true

            while reading do
                let! hasRow = reader.ReadAsync(ct)

                if hasRow then
                    versions.Add(reader.GetString(0))
                else
                    reading <- false

            return List.ofSeq versions
        }
