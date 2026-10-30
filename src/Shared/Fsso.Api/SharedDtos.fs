// 文件职责：共享 DTO 定义带 StatusCode、Code、Message、TraceId 的 ErrorResponse 与仅含 Status 的 HealthResponse，均标记 CLIMutable 供 System.Text.Json 反序列化和 OpenAPI 复用，这两个简单记录不包含校验或业务行为，供健康检查与错误映射复用。
namespace Fsso.Api

[<CLIMutable>]
type ErrorResponse =
    { StatusCode: int
      Code: string
      Message: string
      TraceId: string }

[<CLIMutable>]
type HealthResponse = { Status: string }
