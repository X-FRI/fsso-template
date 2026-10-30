// 文件职责：组合根作为模块化组合的唯一装配入口，把 DemoMigrations.all 与 NotesMigrations.all 合并为启动迁移序列，并提供 resolveDatabasePath、migrate 与 registerInfrastructure 来装配 SqliteUnitOfWork 和 StoreFactory 校验，不直接实现端点或领域规则。
namespace Fsso.Composition

open System
open System.IO
open System.Threading
open Microsoft.Extensions.DependencyInjection
open Fsso.Application
open Fsso.Database
open Fsso.Infrastructure
open Fsso.Notes.Infrastructure

module Composition =
    // 空白或缺失的配置回退到 data/fsso.db，并统一转为绝对路径，避免工作目录变化造成数据库位置歧义。
    let resolveDatabasePath (configured: string option) : string =
        let value =
            match configured with
            | Some path when not (String.IsNullOrWhiteSpace path) -> path
            | _ -> Path.Combine("data", "fsso.db")

        Path.GetFullPath value

    // 迁移清单先 Demo 后 Notes 拼接，执行器再按版本排序，保证跨模块迁移顺序确定且可复核。
    let private migrations =
        DemoMigrations.all @ NotesMigrations.all

    // migrate 把聚合清单交给 Migrations.apply，重复启动由 schema_migrations 记录保证幂等。
    let migrate (dbPath: string) (ct: CancellationToken) : System.Threading.Tasks.Task =
        Migrations.apply dbPath migrations ct

    // 先执行 StoreFactory.validate 失败即停，再注册单例 IUnitOfWork 延迟创建 SqliteUnitOfWork，使 store 注册缺失在启动期暴露。
    let registerInfrastructure (services: IServiceCollection) (dbPath: string) : unit =
        StoreFactory.validate ()
        services.AddSingleton<IUnitOfWork>(fun _ -> SqliteUnitOfWork(dbPath) :> IUnitOfWork)
        |> ignore
