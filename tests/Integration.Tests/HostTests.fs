// 文件职责：Demo HTTP 端点集成测试，断言创建读取分页删除、Location 头、统一错误响应键、查询溢出边界、大小写重复冲突、500 不泄露哨兵以及未知 API 返回 JSON 404。
module Fsso.Integration.HostTests

open System
open System.Net
open System.Net.Http
open System.Text
open System.Text.Json
open System.Threading.Tasks
open Xunit
open Fsso.Host
open Fsso.Integration.Support

// 统一错误契约固定四个键并排序比较，同时要求 JSON 内容类型，防止错误体形状漂移。
let private assertErrorShape (status: HttpStatusCode) (response: HttpResponseMessage) =
    Assert.Equal(status, response.StatusCode)
    Assert.StartsWith("application/json", response.Content.Headers.ContentType.MediaType)
    let body = bodyText response
    Assert.Equal<string list>([ "code"; "message"; "statusCode"; "traceId" ], propertyNames body)

[<Fact>]
let ``HttpCrud creates reads lists and deletes with Location`` () =
    withApp (fun client _ ->
        task {
            let! created = postDemo client "  Http Demo  " "  body  "
            Assert.Equal(HttpStatusCode.Created, created.StatusCode)
            Assert.True(created.Headers.Location <> null)
            let demo = readDemo created
            Assert.Equal("Http Demo", demo.Name)
            Assert.Equal("body", demo.Description)
            Assert.Equal(sprintf "/api/demos/%s" demo.Id, created.Headers.Location.ToString())

            let! read = client.GetAsync(sprintf "/api/demos/%s" demo.Id)
            Assert.Equal(HttpStatusCode.OK, read.StatusCode)
            Assert.Equal(demo.Id, (readDemo read).Id)

            let! listed = client.GetAsync("/api/demos")
            Assert.Equal(HttpStatusCode.OK, listed.StatusCode)
            let paged = readPaged listed
            Assert.Equal(1, paged.Page)
            Assert.Equal(10, paged.Limit)
            Assert.Equal(1L, paged.Total)
            Assert.Equal(1, paged.Data.Length)

            let! deleted = client.DeleteAsync(sprintf "/api/demos/%s" demo.Id)
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode)

            let! missing = client.GetAsync(sprintf "/api/demos/%s" demo.Id)
            assertErrorShape HttpStatusCode.NotFound missing
        })

[<Fact>]
let ``HttpValidation returns uniform 400 responses`` () =
    withApp (fun client _ ->
        task {
            let! malformed = postJson client "/api/demos" "{"
            assertErrorShape HttpStatusCode.BadRequest malformed

            let! empty = postJson client "/api/demos" ""
            assertErrorShape HttpStatusCode.BadRequest empty

            let! emptyName = postJson client "/api/demos" """{"name":"   "}"""
            assertErrorShape HttpStatusCode.BadRequest emptyName

            let! blankName = postJson client "/api/demos" """{"description":"x"}"""
            assertErrorShape HttpStatusCode.BadRequest blankName

            for query in [ "?page=0"; "?limit=0"; "?limit=101"; "?page=abc"; "?page=1&page=2"; "?limit=1&limit=2" ] do
                let! response = client.GetAsync("/api/demos" + query)
                assertErrorShape HttpStatusCode.BadRequest response

            let! badId = client.GetAsync("/api/demos/not-a-guid")
            assertErrorShape HttpStatusCode.BadRequest badId

            let! badDelete = client.DeleteAsync("/api/demos/not-a-guid")
            assertErrorShape HttpStatusCode.BadRequest badDelete

            // 21474838 页会超出 int 乘法，必须返回 400；下一行边界页仍应成功并给出空数据。
            let! overflow = client.GetAsync("/api/demos?page=21474838&limit=100")
            assertErrorShape HttpStatusCode.BadRequest overflow

            let! boundary = client.GetAsync("/api/demos?page=21474836&limit=100")
            Assert.Equal(HttpStatusCode.OK, boundary.StatusCode)
            Assert.Equal(0, (readPaged boundary).Data.Length)
        })

[<Fact>]
let ``HttpMissing returns 404 and duplicate returns 409`` () =
    withApp (fun client _ ->
        task {
            let missingId = Guid.NewGuid().ToString("D")
            let! missing = client.GetAsync(sprintf "/api/demos/%s" missingId)
            assertErrorShape HttpStatusCode.NotFound missing

            let! deleteMissing = client.DeleteAsync(sprintf "/api/demos/%s" missingId)
            assertErrorShape HttpStatusCode.NotFound deleteMissing

            // 先创建 Case 再用小写 case 创建，验证 NOCASE 唯一约束映射为 409 且总数仍为一。
            let! first = postDemo client "Case" "one"
            Assert.Equal(HttpStatusCode.Created, first.StatusCode)
            let! duplicate = postDemo client "case" "two"
            assertErrorShape HttpStatusCode.Conflict duplicate
            Assert.Equal(1L, (readPaged (client.GetAsync("/api/demos").Result)).Total)
        })

[<Fact>]
let ``HttpUnhandledException returns uniform 500 without leaking sentinel`` () =
    withAppOnDb (newDbPath ()) true (fun client _ ->
        task {
            let request = new HttpRequestMessage(HttpMethod.Post, "/api/demos")
            request.Headers.Add("X-Test-Fault", "throw-after-write")
            request.Content <-
                new StringContent("""{"name":"SENTINEL_SECRET_VALUE"}""", Encoding.UTF8, "application/json")

            let! response = client.SendAsync(request)
            assertErrorShape HttpStatusCode.InternalServerError response
            // 哨兵名称和异常类型都不能出现在响应体，仅允许统一错误结构，避免内部信息泄漏。
            let body = bodyText response
            Assert.DoesNotContain("SENTINEL_SECRET_VALUE", body)
            Assert.DoesNotContain("InvalidOperationException", body)
            Assert.DoesNotContain("Injected failure", body)
        })

[<Fact>]
let ``Unknown api path returns JSON 404`` () =
    withApp (fun client _ ->
        task {
            let! response = client.GetAsync("/api/does-not-exist")
            assertErrorShape HttpStatusCode.NotFound response
        })

[<Fact>]
let ``Health returns ok`` () =
    withApp (fun client _ ->
        task {
            let! response = client.GetAsync("/api/health")
            Assert.Equal(HttpStatusCode.OK, response.StatusCode)
            let body = bodyText response
            Assert.Contains("\"status\":\"ok\"", body)
        })
