// 文件职责：IWorkScope 暴露泛型 Store<'T> 取得当前工作作用域内的端口；IUnitOfWork.Run 在一次作用域内执行工作函数，向回调提供 token，并返回 Task<Result<'T, AppError>>。提交与回滚语义由具体实现定义，本层不声明异常处理方式或 token 与输入 ct 的等同关系。
namespace Fsso.Application

open System.Threading
open System.Threading.Tasks

type IWorkScope =
    // Store 以泛型类型作为唯一键返回当前工作作用域的端口实例，调用方不应自行持有或跨作用域复用。
    abstract Store<'T> : unit -> 'T

type IUnitOfWork =
    // Run 在一次工作单元作用域内执行 work，由实现向回调提供 token；返回 Result<'T, AppError>，提交与回滚语义由实现定义，本接口不承诺 token 与传入 ct 相同或所有异常路径均回滚。
    abstract Run<'T> :
        work: (IWorkScope -> CancellationToken -> Task<Result<'T, AppError>>) ->
        ct: CancellationToken ->
            Task<Result<'T, AppError>>
