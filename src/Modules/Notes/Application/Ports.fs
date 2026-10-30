// 文件职责：Notes 应用端口声明 INoteStore 的 FindById 与 Insert 两个异步方法；Insert 约定为异步写入并返回 Note，当前 SQLite 实现可能返回传入的 Note 并标记写入，但该行为不属于端口契约，端口也不暴露事务控制。
namespace Fsso.Notes.Application

open System.Threading
open System.Threading.Tasks
open Fsso.Notes.Domain

// 端口只暴露读写能力并接收 CancellationToken，签名仅约定 Insert 异步写入并返回 Task<Note>，不包含写入标记、事务控制或返回对象来源的约定。
type INoteStore =
    // FindById 按 NoteId 异步读取，未找到返回 None，不擅自生成应用错误。
    abstract FindById: NoteId * CancellationToken -> Task<Note option>
    // Insert 异步写入并返回 Note；返回传入对象还是读取结果由实现决定，写入标记与提交也由实现自行处理，不在端口契约内。
    abstract Insert: Note * CancellationToken -> Task<Note>
