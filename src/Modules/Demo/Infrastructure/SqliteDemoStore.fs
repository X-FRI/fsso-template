// 文件职责：SqliteDemoStore 绑定 QueryContext、SqliteTransaction 与 markWrite，在 main.demos 行和 Demo 之间做 UTC 往返映射，实现按标识查询、created_at 与 id 倒序分页、总数统计、插入冲突映射和删除，所有写入通过 markWrite 通知工作单元。
namespace Fsso.Infrastructure

open System
open System.Globalization
open System.Threading
open System.Threading.Tasks
open Microsoft.Data.Sqlite
open SqlHydra.Query
open Fsso.Application
open Fsso.Database
open Fsso.Database.Generated
open Fsso.Domain

type SqliteDemoStore(context: QueryContext, transaction: SqliteTransaction, markWrite: unit -> unit) =
    // toDomain 按 RoundtripKind 解析数据库时间并统一转 UTC，避免本地时区偏移污染领域对象。
    static member private toDomain (row: Generated.main.demos) : Demo =
        let parse (value: string) =
            DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind)
            |> fun parsed -> parsed.ToUniversalTime()

        Demo.reconstitute
            (DemoId.create (Guid.Parse row.id))
            row.name
            row.description
            (parse row.created_at)
            (parse row.updated_at)

    // toRow 用 O 格式写入时间，保证与 toDomain 的 UTC 往返一致。
    static member private toRow (demo: Demo) : Generated.main.demos =
        { id = DemoId.toString demo.Id
          name = demo.Name
          description = demo.Description
          created_at = demo.CreatedAt.ToString("O", CultureInfo.InvariantCulture)
          updated_at = demo.UpdatedAt.ToString("O", CultureInfo.InvariantCulture) }

    interface IDemoStore with
        member _.FindById(id, ct) =
            task {
                let! row =
                    select {
                        for demo in Tables.Demo do
                        where (demo.id = DemoId.toString id)
                        select demo
                    }
                    |> fun query -> context.SelectOneAsyncWithOptions(query, ct)

                return row |> Option.map SqliteDemoStore.toDomain
            }

        // List 先按 created_at、id 双列倒序分页，再用独立计数命令返回总数。
        member _.List(page, limit, ct) =
            task {
                let offset = (page - 1) * limit

                let! rows =
                    select {
                        for demo in Tables.Demo do
                        orderByDescending demo.created_at
                        thenByDescending demo.id
                        skip offset
                        take limit
                        select demo
                    }
                    |> fun query -> context.SelectAsyncWithOptions(query, ct)

                // 计数命令显式绑定当前事务，避免在同一连接的活跃事务外读取导致不一致。
                use count = context.Connection.CreateCommand()
                count.Transaction <- transaction
                count.CommandText <- "SELECT COUNT(*) FROM demos;"
                let! total = count.ExecuteScalarAsync(ct)

                return
                    { Items = rows |> Seq.map SqliteDemoStore.toDomain |> List.ofSeq
                      Total = Convert.ToInt64 total }
            }

        // Insert 把 SQLite 约束错误（通用码 19 或唯一约束扩展码 2067）转换为稳定 conflict，其他异常交由工作单元回滚。
        member _.Insert(demo, ct) =
            task {
                try
                    let! _ =
                        insert {
                            into Tables.Demo
                            entity (SqliteDemoStore.toRow demo)
                        }
                        |> fun query -> context.InsertAsyncWithOptions(query, ct)

                    // 插入成功后标记写入，使共享工作单元只在有写入的 Ok 结果上提交。
                    markWrite ()
                    return Ok()
                with
                // 现有代码将 SQLite 通用约束码 19 或唯一约束扩展码 2067 都映射为 conflict；19 并非唯一约束专属，此映射行为保持不变。
                | :? SqliteException as ex when ex.SqliteErrorCode = 19 || ex.SqliteExtendedErrorCode = 2067 ->
                    return Error(AppError.conflict "A demo with this name already exists.")
            }

        // Delete 使用当前事务删除匹配行，并依赖调用方先完成存在性检查。
        member _.Delete(id, ct) =
            task {
                let! _ =
                    delete {
                        for demo in Tables.Demo do
                        where (demo.id = DemoId.toString id)
                    }
                    |> fun query -> context.DeleteAsyncWithOptions(query, ct)

                // 删除成功后标记写入，确保 Demo 与 Notes 的变更在同一事务中提交。
                markWrite ()
            }

module DemoStoreRegistration =
    let typeKey = typeof<IDemoStore>

    let create (context: QueryContext) (transaction: SqliteTransaction) (markWrite: unit -> unit) : obj =
        (SqliteDemoStore(context, transaction, markWrite) :> obj)
