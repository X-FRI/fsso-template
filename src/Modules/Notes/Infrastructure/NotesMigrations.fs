// 文件职责：NotesMigrations 读取 Notes.Infrastructure 程序集中 migrations.* 嵌入资源，按 Ordinal 排序并以文件名去掉前缀和扩展名作为版本，暴露 NotesMigrations.all 供组合根合并执行。
namespace Fsso.Notes.Infrastructure

open System
open System.IO
open System.Reflection
open Fsso.Database

module NotesMigrations =
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
