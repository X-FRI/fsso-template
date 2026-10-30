// 文件职责：Notes 的 HTTP DTO 定义 CreateNoteRequest、NoteResponse 与 noteResponse、toBody、toIso 映射，把 Note 的可选正文转换为 null 或 option，并将创建时间格式化为 UTC ISO 字符串，这些类型同时服务端点与接口文档。
namespace Fsso.Notes.Api

open System
open Fsso.Notes.Domain

[<CLIMutable>]
type CreateNoteRequest =
    { Title: string
      Body: string | null }

[<CLIMutable>]
type NoteResponse =
    { Id: string
      Title: string
      Body: string | null
      CreatedAt: string }

module NoteDtos =
    let private toIso (value: DateTime) =
        value.ToUniversalTime().ToString("O", Globalization.CultureInfo.InvariantCulture)

    let noteResponse (note: Note) : NoteResponse =
        { Id = NoteId.toString note.Id
          Title = note.Title
          Body =
              match note.Body with
              | Some value -> value
              | None -> null
          CreatedAt = toIso note.CreatedAt }

    let toBody (value: string | null) =
        match value with
        | null -> None
        | actual -> Some actual
