// 文件职责：DemoMigrations 从当前程序集的 migrations.* 嵌入资源按 Ordinal 排序读取 SQL，用去掉前缀与 .sql 的名称作为迁移版本，并聚合为 Composition 使用的 DemoMigrations.all，不负责执行事务。
namespace Fsso.Infrastructure

open System
open System.IO
open System.Reflection
open Fsso.Database

module DemoMigrations =
    let private load () =
        let assembly = Assembly.GetExecutingAssembly()

        assembly.GetManifestResourceNames()
        |> Array.filter (fun name -> name.StartsWith("migrations.", StringComparison.Ordinal))
        |> Array.sortWith (fun a b -> String.CompareOrdinal(a, b))
        |> Array.map (fun name ->
            let version =
                name.Substring("migrations.".Length).Replace(".sql", String.Empty)

            let stream =
                match assembly.GetManifestResourceStream name with
                | null -> failwithf "embedded migration not found: %s" name
                | found -> found

            use reader = new StreamReader(stream)
            { Version = version; Sql = reader.ReadToEnd() })
        |> List.ofArray

    let all = load ()
