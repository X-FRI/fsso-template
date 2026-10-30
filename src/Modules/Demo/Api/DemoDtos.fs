// 文件职责：Demo 的 HTTP DTO 与映射函数定义 CreateDemoRequest、DemoResponse、PagedDemoResponse 三个契约类型，并把 Demo 实体的空描述转为 null、时间转 UTC ISO 字符串，兼容分页总数为 int64，供端点与 OpenAPI 共用且不包含持久化逻辑。
namespace Fsso.Demo.Api

open System
open Fsso.Application
open Fsso.Domain

[<CLIMutable>]
type CreateDemoRequest =
    { Name: string
      Description: string | null }

[<CLIMutable>]
type DemoResponse =
    { Id: string
      Name: string
      Description: string | null
      CreatedAt: string
      UpdatedAt: string }

[<CLIMutable>]
type PagedDemoResponse =
    { Data: DemoResponse[]
      Page: int
      Limit: int
      Total: int64 }

module DemoDtos =
    let private toIso (value: DateTime) =
        value.ToUniversalTime().ToString("O", Globalization.CultureInfo.InvariantCulture)

    let demoResponse (demo: Demo) : DemoResponse =
        { Id = DemoId.toString demo.Id
          Name = demo.Name
          Description =
              match demo.Description with
              | Some value -> value
              | None -> null
          CreatedAt = toIso demo.CreatedAt
          UpdatedAt = toIso demo.UpdatedAt }

    let pagedDemoResponse (page: int) (limit: int) (paged: PagedDemos) : PagedDemoResponse =
        { Data = paged.Items |> List.map demoResponse |> Array.ofList
          Page = page
          Limit = limit
          Total = paged.Total }

    let toDescription (value: string | null) =
        match value with
        | null -> None
        | actual -> Some actual
