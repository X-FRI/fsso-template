// 文件职责：Notes 模块描述符注册 CreateNoteCommand 所在程序集的 MediatR handler，声明无额外 OpenAPI 变换、NoteEndpoints 映射和唯一迁移版本 003_create_notes，供 Host 无类型依赖地装配，该描述符不暴露 Notes 领域类型。
namespace Fsso.Notes.Api

open System
open Microsoft.Extensions.DependencyInjection
open MediatR
open Fsso.Api
open Fsso.Notes.Application

module NotesModule =
    let descriptor: ModuleDescriptor =
        { Name = "Notes"
          RegisterServices =
            fun services ->
                services.AddMediatR(
                    Action<MediatRServiceConfiguration>(fun config ->
                        config.RegisterServicesFromAssembly(typeof<CreateNoteCommand>.Assembly) |> ignore)
                )
                |> ignore
          ConfigureOpenApi = fun _ -> ()
          MapEndpoints = NoteEndpoints.map
          MigrationVersions = [ "003_create_notes" ] }
