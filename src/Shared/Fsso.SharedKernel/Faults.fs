// 文件职责：IFaultInjector 抽象写入后的故障注入点，仅声明 AfterWrite 接收取消令牌并返回 Result<unit, AppError>，用于测试提交前失败、延迟和异常回滚而不污染生产存储实现。
namespace Fsso.Application

open System.Threading
open System.Threading.Tasks

// IFaultInjector 只服务于测试，生产实现默认无操作，避免把故障注入逻辑耦合进 store。
type IFaultInjector =
    // AfterWrite 在写操作之后、提交之前调用，可制造失败、抛异常或延迟，用来验证回滚与取消边界。
    abstract AfterWrite: CancellationToken -> Task<Result<unit, AppError>>
