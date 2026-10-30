// 文件职责：工作作用域持有已构造的 store 字典，通过泛型 Store<'T> 按 Type 查找并做类型转换，缺失注册时立即失败，确保 handler 只能取得当前事务绑定的端口实现。
namespace Fsso.Composition

open System
open System.Collections.Generic
open Fsso.Application

type SqliteWorkScope(stores: IDictionary<Type, obj>) =
    interface IWorkScope with
        // Store 用 typeof<'T> 精确查找已注册实例，缺失注册立即失败而不是返回默认值，防止误用其他事务的 store。
        member _.Store<'T>() =
            match stores.TryGetValue typeof<'T> with
            | true, value -> value :?> 'T
            | _ -> failwithf "No store is registered for %s." typeof<'T>.FullName
