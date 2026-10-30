// 文件职责：Demo 领域模型定义私有构造的 DemoId、Guid.CreateVersion7 生成、名称与描述去空白校验以及名称一百字、描述五百字的长度上限，create 与 reconstitute 分别服务新建和持久化还原。
namespace Fsso.Domain

open System

[<Struct>]
type DemoId = private DemoId of Guid

module DemoId =
    let create (value: Guid) = DemoId value

    let newId () = DemoId(Guid.CreateVersion7())

    let value (DemoId value) = value

    let toString (DemoId value) = value.ToString("D")

    let tryParse (value: string) =
        match Guid.TryParse value with
        | true, parsed -> Some(DemoId parsed)
        | false, _ -> None

    let parse (value: string) =
        match tryParse value with
        | Some id -> Ok id
        | None -> Error "Invalid demo id."

type Demo =
    { Id: DemoId
      Name: string
      Description: string option
      CreatedAt: DateTime
      UpdatedAt: DateTime }

type ValidationError =
    | NameRequired
    | NameTooLong of actual: int
    | DescriptionTooLong of actual: int

module ValidationError =
    let message error =
        match error with
        | NameRequired -> "Name is required."
        | NameTooLong actual -> sprintf "Name must be at most 100 characters (got %d)." actual
        | DescriptionTooLong actual ->
            sprintf "Description must be at most 500 characters (got %d)." actual

type ValidatedDemo =
    { Name: string
      Description: string option }

module Demo =
    let private trim (value: string | null) =
        match value with
        | null -> ""
        | actual -> actual.Trim()

    let validate (name: string | null) (description: string option) =
        let trimmedName = trim name
        if trimmedName.Length = 0 then
            Error NameRequired
        elif trimmedName.Length > 100 then
            Error(NameTooLong trimmedName.Length)
        else
            let trimmedDescription =
                description
                |> Option.map trim
                |> Option.bind (fun value -> if value.Length = 0 then None else Some value)

            match trimmedDescription with
            | Some value when value.Length > 500 -> Error(DescriptionTooLong value.Length)
            | _ -> Ok { Name = trimmedName; Description = trimmedDescription }

    let create (name: string | null) (description: string option) =
        validate name description
        |> Result.map (fun input ->
            let now = DateTime.UtcNow
            { Id = DemoId.newId ()
              Name = input.Name
              Description = input.Description
              CreatedAt = now
              UpdatedAt = now })

    let reconstitute id name description createdAt updatedAt =
        { Id = id
          Name = name
          Description = description
          CreatedAt = createdAt
          UpdatedAt = updatedAt }
