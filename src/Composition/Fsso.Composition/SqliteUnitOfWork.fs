// 文件职责：SQLite 工作单元按类型键反射解析 IDemoStore 与 INoteStore 的注册工厂，在单个连接与事务内创建 SqliteWorkScope，并按 markWrite 计数决定提交。OpenContext、PRAGMA 与 BeginTransaction 在 try 之前执行，失败会直接传播；进入 try 后，Ok 零写入与 Error 会先以 ct 回滚，取消与其他异常进入 catch 后以 None 令牌回滚。普通路径第一次回滚失败会按异常类型进入 catch 并再次回滚。非取消路径上，catch 分支回滚失败时直接传播该次回滚异常，回滚成功时返回携带原异常 Cause 的 AppError.unexpected（原异常可能是普通路径第一次回滚抛出的异常）；取消路径上，catch 分支回滚成功时重抛原 OperationCanceledException，回滚失败时传播该次回滚异常。
namespace Fsso.Composition

open System
open System.Collections.Generic
open System.Data.Common
open System.Runtime.ExceptionServices
open System.Threading
open System.Threading.Tasks
open System.Reflection
open Microsoft.Data.Sqlite
open SqlHydra.Query
open Fsso.Application
open Fsso.Database
open Fsso.Database.Generated

module private StoreKeys =
    let private key (typeName: string) (assemblyName: string) =
        match Type.GetType(sprintf "%s, %s" typeName assemblyName, false) with
        | null -> failwithf "Store type %s was not found in assembly %s." typeName assemblyName
        | found -> found

    let demo =
        lazy (key "Fsso.Application.IDemoStore" "Fsso.Modules.Demo.Application")

    let note =
        lazy (key "Fsso.Notes.Application.INoteStore" "Fsso.Modules.Notes.Application")

module internal StoreFactory =
    let private find (typeName: string) (assemblyName: string) =
        let storeType =
            match Type.GetType(sprintf "%s, %s" typeName assemblyName, false) with
            | null -> failwithf "Store registration %s was not found in assembly %s." typeName assemblyName
            | found -> found

        match storeType.GetMethod("create", BindingFlags.Public ||| BindingFlags.Static) with
        | null -> failwithf "Store registration %s has no public static create method." typeName
        | found -> found

    let private demoCreate =
        lazy (find "Fsso.Infrastructure.DemoStoreRegistration" "Fsso.Modules.Demo.Infrastructure")

    let private noteCreate =
        lazy (find "Fsso.Notes.Infrastructure.NoteStoreRegistration" "Fsso.Modules.Notes.Infrastructure")

    let private invoke (expectedType: Type) (methodInfo: MethodInfo) (context: QueryContext) (transaction: SqliteTransaction) (markWrite: unit -> unit) : obj =
        let write = FuncConvert.FromAction(Action markWrite)

        match methodInfo.Invoke(null, [| box context; box transaction; box write |]) with
        | null -> failwithf "Store registration %s returned null." methodInfo.Name
        | store when expectedType.IsInstanceOfType store -> store
        | store ->
            failwithf
                "Store registration %s returned %s, which does not implement %s."
                methodInfo.Name
                (store.GetType().FullName)
                expectedType.FullName

    let demo context transaction markWrite =
        invoke StoreKeys.demo.Value demoCreate.Value context transaction markWrite

    let note context transaction markWrite =
        invoke StoreKeys.note.Value noteCreate.Value context transaction markWrite

    let validate () =
        let _ = StoreKeys.demo.Value
        let _ = StoreKeys.note.Value
        let _ = demoCreate.Value
        let _ = noteCreate.Value
        ()

type SqliteUnitOfWork(dbPath: string) =
    interface IUnitOfWork with
        // Run 为每次调用创建独立连接、事务与 SqliteWorkScope；work 回调收到传入的 ct，所有 store 共享同一事务。
        member _.Run work ct =
            task {
                let factory = QueryContextFactory.Create(Db.connectionString dbPath)
                use! context = factory.OpenContextAsync()
                use command = context.Connection.CreateCommand()
                // 连接级 PRAGMA 强制外键约束并设置五秒忙等待，降低并发写入立即失败的概率。
                command.CommandText <- "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"
                let! _ = command.ExecuteNonQueryAsync(ct)
                ()
                // 在构造任何 store 之前开启事务，并把事务挂到 QueryContext，确保查询与写入使用同一连接。
                use transaction = context.Connection.BeginTransaction() :?> SqliteTransaction
                context.Transaction <- Some(transaction :> DbTransaction)
                try
                    let mutable writeCount = 0
                    // markWrite 只累计成功写入次数，零写入的只读 Ok 结果不会提交事务。
                    let markWrite () = writeCount <- writeCount + 1
                    let stores = Dictionary<Type, obj>()
                    stores[StoreKeys.demo.Value] <- StoreFactory.demo context transaction markWrite
                    stores[StoreKeys.note.Value] <- StoreFactory.note context transaction markWrite
                    let scope = SqliteWorkScope(stores)
                    let! result = work (scope :> IWorkScope) ct

                    // 仅 Ok 且 writeCount>0 时提交；Ok 但零写入或 Error 都会尝试回滚，提交需要同时满足结果与写入条件。
                    match result with
                    | Ok _ when writeCount > 0 -> do! transaction.CommitAsync(ct)
                    | Ok _ -> do! transaction.RollbackAsync(ct)
                    | Error _ -> do! transaction.RollbackAsync(ct)

                    return result
                with
                // 取消时用 None 令牌回滚以绕过已取消状态；catch 分支这次回滚成功后原样重抛 OperationCanceledException，失败则抛出该次回滚异常。
                | :? OperationCanceledException as ex ->
                    do! transaction.RollbackAsync(CancellationToken.None)
                    ExceptionDispatchInfo.Capture(ex).Throw()
                    return Unchecked.defaultof<Result<'T, AppError>>
                // 非取消异常（包括普通路径第一次回滚失败）先用 None 令牌回滚；catch 分支这次回滚成功时包装为 AppError.unexpected，失败时抛出该次回滚异常，避免误报原始异常已处理。
                | ex ->
                    do! transaction.RollbackAsync(CancellationToken.None)
                    return Error(AppError.unexpected ex)
            }
