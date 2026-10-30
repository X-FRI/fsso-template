// 文件职责：创建 Note 的 Fsso.Notes.Application 命令携带可空标题与可选正文，并以 IRequest<Result<Note, AppError>> 交由 CreateNoteHandler 完成领域校验和持久化，命令仅描述意图而不直接访问存储。
namespace Fsso.Notes.Application

open MediatR
open Fsso.Application
open Fsso.Notes.Domain

type CreateNoteCommand =
    { Title: string | null
      Body: string option }
    interface IRequest<Result<Note, AppError>>
