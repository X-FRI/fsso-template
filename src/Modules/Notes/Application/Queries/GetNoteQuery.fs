// 文件职责：获取 Note 的查询记录只保存 NoteId，并实现 IRequest<Result<Note, AppError>>，由 GetNoteHandler 解析为读取结果或 not_found，查询只承载目标标识，不包含分页、过滤或排序条件，也不直接访问存储。
namespace Fsso.Notes.Application

open MediatR
open Fsso.Application
open Fsso.Notes.Domain

type GetNoteQuery =
    { Id: NoteId }
    interface IRequest<Result<Note, AppError>>
