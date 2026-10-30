// 文件职责：Demo 应用层 handler 测试，用内存 FakeStore 与真实 MediatR 容器验证创建校验、冲突传播、查询未找到以及分页边界，不接触 SQLite 或网络。
module Fsso.Application.Tests

open System
open System.Threading
open System.Threading.Tasks
open Xunit
open Microsoft.Extensions.DependencyInjection
open MediatR
open Fsso.Application
open Fsso.Domain

// 内存假存储只实现端口行为，隔离 handler 测试与真实 SQLite，避免共享临时库和迁移开销。
type private FakeStore(initial: Demo list) =
    let mutable items = initial
    member val FailInsert: AppError option = None with get, set

    interface IDemoStore with
        member _.FindById(id, _) =
            Task.FromResult(items |> List.tryFind (fun demo -> demo.Id = id))

        member _.List(page, limit, _) =
            let ordered =
                items
                |> List.sortByDescending (fun demo -> demo.CreatedAt, DemoId.value demo.Id)

            let pageItems = ordered |> List.skip ((page - 1) * limit) |> List.truncate limit
            Task.FromResult { Items = pageItems; Total = int64 items.Length }

        member this.Insert(demo, _) =
            match this.FailInsert with
            | Some error -> Task.FromResult(Error error)
            | None ->
                items <- demo :: items
                Task.FromResult(Ok())

        member _.Delete(id, _) =
            items <- items |> List.filter (fun demo -> demo.Id <> id)
            Task.FromResult()

type private FakeScope(store: FakeStore) =
    interface IWorkScope with
        member _.Store<'T>() = box store :?> 'T

type private FakeUow(store: FakeStore) =
    interface IUnitOfWork with
        member _.Run work ct = work (FakeScope store :> IWorkScope) ct

type private NoFault() =
    interface IFaultInjector with
        member _.AfterWrite(_) = Task.FromResult(Ok())

// 直接注册 Application 程序集中的 handler，验证 MediatR 分派而不启动 Host 或 HTTP 管道。
let private sender store =
    let services = ServiceCollection()
    services.AddSingleton<IUnitOfWork>(FakeUow store :> IUnitOfWork) |> ignore
    services.AddSingleton<IFaultInjector>(NoFault() :> IFaultInjector) |> ignore
    services.AddMediatR(
        System.Action<MediatRServiceConfiguration>(fun config ->
            config.RegisterServicesFromAssembly(typeof<CreateDemoCommand>.Assembly) |> ignore))
    |> ignore
    services.BuildServiceProvider().GetRequiredService<ISender>()

[<Fact>]
let ``CreateDemo persists a validated demo`` () =
    let store = FakeStore []
    let result = (sender store).Send(({ Name = "  Demo  "; Description = Some " text " }: CreateDemoCommand), CancellationToken.None) |> fun t -> t.Result
    match result with
    | Ok demo ->
        Assert.Equal("Demo", demo.Name)
        Assert.Equal(Some "text", demo.Description)
    | Error error -> failwithf "unexpected %A" error

[<Fact>]
let ``CreateDemo maps domain validation to AppError`` () =
    let result = (sender (FakeStore [])).Send(({ Name = " "; Description = None }: CreateDemoCommand), CancellationToken.None) |> fun t -> t.Result
    match result with
    | Error error ->
        Assert.Equal(Validation, error.Kind)
        Assert.Equal("validation", error.Code)
    | Ok _ -> failwith "expected validation error"

// 让假存储返回冲突，确认 handler 传播的 AppError.Kind 仍是 Conflict；该测试未断言 Code 与 Message 保持不变。
[<Fact>]
let ``CreateDemo propagates store conflict`` () =
    let store = FakeStore []
    store.FailInsert <- Some(AppError.conflict "duplicate")
    let result = (sender store).Send(({ Name = "x"; Description = None }: CreateDemoCommand), CancellationToken.None) |> fun t -> t.Result
    match result with
    | Error error -> Assert.Equal(Conflict, error.Kind)
    | Ok _ -> failwith "expected conflict"

[<Fact>]
let ``GetDemo returns NotFound for missing id`` () =
    let result = (sender (FakeStore [])).Send(({ Id = DemoId.newId () }: GetDemoQuery), CancellationToken.None) |> fun t -> t.Result
    match result with
    | Error error -> Assert.Equal(NotFound, error.Kind)
    | Ok _ -> failwith "expected not found"

// 页码下界与页大小上界都必须返回 Validation，覆盖分页参数的两侧边界。
[<Fact>]
let ``ListDemos rejects invalid page and limit`` () =
    let h = sender (FakeStore [])
    match h.Send(({ Page = 0; Limit = 10 }: ListDemosQuery), CancellationToken.None) |> fun t -> t.Result with
    | Error error -> Assert.Equal(Validation, error.Kind)
    | Ok _ -> failwith "expected validation"

    match h.Send(({ Page = 1; Limit = 101 }: ListDemosQuery), CancellationToken.None) |> fun t -> t.Result with
    | Error error -> Assert.Equal(Validation, error.Kind)
    | Ok _ -> failwith "expected validation"

[<Fact>]
let ``DeleteDemo returns NotFound when missing`` () =
    let result = (sender (FakeStore [])).Send(({ Id = DemoId.newId () }: DeleteDemoCommand), CancellationToken.None) |> fun t -> t.Result
    match result with
    | Error error -> Assert.Equal(NotFound, error.Kind)
    | Ok _ -> failwith "expected not found"
