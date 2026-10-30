// 文件职责：Note 领域模型以私有 NoteId、Guid.CreateVersion7、标题与正文去空白规则和标题一百二十字、正文四千字上限维护不变量，create 生成时间戳而 reconstitute 用于数据库还原。
namespace Fsso.Notes.Domain

open System

[<Struct>]
type NoteId = private NoteId of Guid

module NoteId =
    let create (value: Guid) = NoteId value

    let newId () = NoteId(Guid.CreateVersion7())

    let toString (NoteId value) = value.ToString("D")

    let tryParse (value: string) =
        match Guid.TryParse value with
        | true, parsed -> Some(NoteId parsed)
        | false, _ -> None

type Note =
    { Id: NoteId
      Title: string
      Body: string option
      CreatedAt: DateTime }

type ValidationError =
    | TitleRequired
    | TitleTooLong of actual: int
    | BodyTooLong of actual: int

module ValidationError =
    let message error =
        match error with
        | TitleRequired -> "Title is required."
        | TitleTooLong actual -> sprintf "Title must be at most 120 characters (got %d)." actual
        | BodyTooLong actual -> sprintf "Body must be at most 4000 characters (got %d)." actual

type ValidatedNote =
    { Title: string
      Body: string option }

module Note =
    let private trim (value: string | null) =
        match value with
        | null -> ""
        | actual -> actual.Trim()

    let validate (title: string | null) (body: string option) =
        let trimmedTitle = trim title

        if trimmedTitle.Length = 0 then
            Error TitleRequired
        elif trimmedTitle.Length > 120 then
            Error(TitleTooLong trimmedTitle.Length)
        else
            let trimmedBody =
                body
                |> Option.map trim
                |> Option.bind (fun value -> if value.Length = 0 then None else Some value)

            match trimmedBody with
            | Some value when value.Length > 4000 -> Error(BodyTooLong value.Length)
            | _ -> Ok { Title = trimmedTitle; Body = trimmedBody }

    let create (title: string | null) (body: string option) =
        validate title body
        |> Result.map (fun input ->
            { Id = NoteId.newId ()
              Title = input.Title
              Body = input.Body
              CreatedAt = DateTime.UtcNow })

    let reconstitute id title body createdAt =
        { Id = id
          Title = title
          Body = body
          CreatedAt = createdAt }
