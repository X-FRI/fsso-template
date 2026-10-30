// 文件职责：Demo 应用端口定义 PagedDemos 与 IDemoStore 的 FindById、List、Insert、Delete 异步签名；各方法接收 CancellationToken，端口不暴露事务控制。当前 SqliteDemoStore 实现使用 markWrite 与当前事务，属于实现细节而非端口契约。
namespace Fsso.Application

open System
open System.Threading
open System.Threading.Tasks
open Fsso.Domain

type PagedDemos =
    { Items: Demo list
      Total: int64 }

// 端口方法均为异步并接收 CancellationToken，签名不包含 markWrite、提交、回滚或分页一致性保证。
type IDemoStore =
    // FindById 按标识异步读取，未找到返回 None，由 handler 决定是否转成 not_found。
    abstract FindById: DemoId * CancellationToken -> Task<Demo option>
    // List 按页异步读取并返回 PagedDemos；分页快照与事务一致性属于具体实现的细节，不在端口契约内。
    abstract List: page: int * limit: int * CancellationToken -> Task<PagedDemos>
    // Insert 异步写入并返回 Result<unit, AppError>；冲突等错误如何产生由具体实现决定。
    abstract Insert: Demo * CancellationToken -> Task<Result<unit, AppError>>
    // Delete 异步删除并返回 Task<unit>，不返回受影响行数。
    abstract Delete: DemoId * CancellationToken -> Task<unit>
