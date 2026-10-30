// 文件职责：Tables 模块把生成的 main.demos 与 main.notes 表类型包装为 SqlHydra.Query 的 table 值 Demo 与 Note，供 store 查询构造器引用，本身不包含映射或 SQL 逻辑，表名与列名由 SqlHydra 生成类型决定。
namespace Fsso.Database

open SqlHydra.Query
open Fsso.Database.Generated

module Tables =
    let Demo = table<main.demos>
    let Note = table<main.notes>
