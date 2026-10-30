// 文件职责：Demo 领域层纯单元测试，覆盖名称与描述去空白、空名称拒绝、一百与五百字上限、标识格式化和 Guid 往返解析，不启动数据库或 HTTP。
module Fsso.Domain.Tests

open System
open Xunit
open Fsso.Domain

// 断言去空白后的规范值与空描述归为 None，避免把用户空格带入领域对象。
[<Fact>]
let ``DemoCreate trims name and blank description becomes None`` () =
    match Demo.create "  Alpha  " (Some "   ") with
    | Ok demo ->
        Assert.Equal("Alpha", demo.Name)
        Assert.Equal(None, demo.Description)
        Assert.NotEqual(Guid.Empty, DemoId.value demo.Id)
    | Error error -> failwithf "unexpected error %A" error

[<Fact>]
let ``DemoCreate rejects empty and whitespace names`` () =
    Assert.Equal(Error NameRequired, Demo.create "" None)
    Assert.Equal(Error NameRequired, Demo.create "   " None)

// 只验证 101 个字符被拒绝并携带实际长度，未覆盖 100 个字符的接受边界。
[<Fact>]
let ``DemoCreate rejects names over 100 characters`` () =
    match Demo.create (String('a', 101)) None with
    | Error(NameTooLong 101) -> ()
    | other -> failwithf "unexpected %A" other

[<Fact>]
let ``DemoCreate rejects descriptions over 500 characters`` () =
    match Demo.create "ok" (Some(String('a', 501))) with
    | Error(DescriptionTooLong 501) -> ()
    | other -> failwithf "unexpected %A" other

// 往返解析同时覆盖合法 Guid 与非法文本，保证 API 路径参数不会静默接受坏标识。
[<Fact>]
let ``DemoId parses and formats round trip`` () =
    let original = DemoId.newId ()
    let text = DemoId.toString original
    Assert.Equal(Some original, DemoId.tryParse text)
    Assert.Equal(None, DemoId.tryParse "not-a-guid")
