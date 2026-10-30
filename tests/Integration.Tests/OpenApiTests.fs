// 文件职责：OpenAPI 契约集成测试，规范化比较线上文档与签入快照，校验七个操作标识、各端点状态码矩阵、请求响应 schema 以及所有组件引用均可解析。
module Fsso.Integration.OpenApiTests

open System
open System.IO
open System.Net
open System.Text.Json
open System.Text.Json.Nodes
open System.Threading.Tasks
open Xunit
open Fsso.Integration.Support

let private repoRoot =
    let rec find (directory: DirectoryInfo) =
        if isNull directory then failwith "repo root not found"
        elif File.Exists(Path.Combine(directory.FullName, "FssoStack.slnx")) then directory.FullName
        else find directory.Parent

    find (DirectoryInfo AppContext.BaseDirectory)

// 递归按键排序对象并保留数组顺序，消除 JSON 属性顺序差异后再比较线上与签入文档。
let rec private canonical (node: JsonNode) : string =
    match node with
    | null -> "null"
    | :? JsonObject as obj ->
        obj
        |> Seq.sortBy (fun pair -> pair.Key)
        |> Seq.map (fun pair -> JsonSerializer.Serialize pair.Key + ":" + canonical pair.Value)
        |> String.concat ","
        |> sprintf "{%s}"
    | :? JsonArray as array ->
        array |> Seq.map canonical |> String.concat "," |> sprintf "[%s]"
    | _ -> node.ToJsonString()

// 遍历所有 $ref，确保每个引用都落在已声明的 ErrorResponse 等组件内。
let private collectRefs (node: JsonNode) =
    let refs = ResizeArray<string>()

    let rec walk (value: JsonNode) =
        match value with
        | null -> ()
        | :? JsonObject as obj ->
            for pair in obj do
                if pair.Key = "$ref" then refs.Add(pair.Value.GetValue<string>())
                else walk pair.Value
        | :? JsonArray as array ->
            for item in array do
                walk item
        | _ -> ()

    walk node
    List.ofSeq refs

let private statuses (operation: JsonNode) =
    operation["responses"].AsObject()
    |> Seq.map (fun pair -> pair.Key)
    |> Seq.sort
    |> List.ofSeq

[<Fact>]
let ``OpenApiDocument served document equals checked-in and is complete`` () =
    withApp (fun client _ ->
        task {
            let! response = client.GetAsync("/openapi/v1.json")
            Assert.Equal(HttpStatusCode.OK, response.StatusCode)
            let servedText = bodyText response
            let checkedIn = File.ReadAllText(Path.Combine(repoRoot, "openapi", "openapi.json"))

            let served = JsonNode.Parse servedText
            let expected = JsonNode.Parse checkedIn
            Assert.Equal(canonical expected, canonical served)

            let paths = served["paths"].AsObject()
            let operations =
                paths
                |> Seq.collect (fun path -> path.Value.AsObject() |> Seq.map (fun method -> path.Key, method.Key, method.Value))
                |> List.ofSeq

            let ids =
                operations
                |> List.map (fun (_, _, operation) -> operation["operationId"].GetValue<string>())
                |> List.sort

            Assert.Equal<string list>(
                [ "createDemo"; "createNote"; "deleteDemo"; "getDemo"; "getNote"; "health"; "listDemos" ],
                ids
            )

            let findOperation path methodName =
                operations
                |> List.find (fun (candidatePath, candidateMethod, _) -> candidatePath = path && candidateMethod = methodName)
                |> fun (_, _, operation) -> operation

            // 状态码列表来自真实端点映射，用于锁定创建、读取、删除与健康的错误矩阵。
            Assert.Equal<string list>([ "201"; "400"; "409"; "500" ], statuses (findOperation "/api/demos" "post"))
            Assert.Equal<string list>([ "200"; "400"; "500" ], statuses (findOperation "/api/demos" "get"))
            Assert.Equal<string list>([ "200"; "400"; "404"; "500" ], statuses (findOperation "/api/demos/{id}" "get"))
            Assert.Equal<string list>([ "204"; "400"; "404"; "500" ], statuses (findOperation "/api/demos/{id}" "delete"))
            Assert.Equal<string list>([ "200"; "500" ], statuses (findOperation "/api/health" "get"))

            let post = findOperation "/api/demos" "post"
            let requestBody = post["requestBody"]
            let content = requestBody["content"]
            let applicationJson = content["application/json"]
            let schema = applicationJson["schema"]
            // 创建请求必须通过 $ref 指向 CreateDemoRequest，而不是内联结构。
            let requestRef = schema["$ref"].GetValue<string>()
            Assert.Equal("#/components/schemas/CreateDemoRequest", requestRef)

            let componentsNode = served["components"]
            let schemaComponents = (componentsNode["schemas"]).AsObject()
            let errorComponent = schemaComponents["ErrorResponse"]
            Assert.NotNull(errorComponent)

            let schemaOf (name: string) = schemaComponents[name].AsObject()
            let requiredOf (schema: JsonObject) =
                schema["required"].AsArray() |> Seq.map (fun node -> node.GetValue<string>()) |> List.ofSeq
            let typesOf (schema: JsonObject) =
                match schema["type"] with
                | null -> []
                | node when node.GetValueKind() = JsonValueKind.Array ->
                    node.AsArray() |> Seq.map (fun item -> item.GetValue<string>()) |> List.ofSeq
                | node -> [ node.GetValue<string>() ]

            // required 与可空类型分开检查，确认 name 必填而 description 允许 null。
            let createSchema = schemaOf "CreateDemoRequest"
            let createProperties = createSchema["properties"].AsObject()
            let createName = createProperties["name"].AsObject()
            let createDescription = createProperties["description"].AsObject()
            Assert.Contains("name", requiredOf createSchema)
            Assert.DoesNotContain("null", typesOf createName)
            Assert.Contains("null", typesOf createDescription)

            let demoSchema = schemaOf "DemoResponse"
            let demoProperties = demoSchema["properties"].AsObject()
            let demoDescription = demoProperties["description"].AsObject()
            let demoRequired = requiredOf demoSchema
            for field in [ "id"; "name"; "createdAt"; "updatedAt" ] do
                Assert.Contains(field, demoRequired)
            Assert.Contains("null", typesOf demoDescription)

            let components = schemaComponents |> Seq.map (fun pair -> pair.Key) |> Set.ofSeq

            for reference in collectRefs served do
                Assert.StartsWith("#/components/schemas/", reference)
                let name = reference.Substring("#/components/schemas/".Length)
                Assert.True(components.Contains name, (sprintf "unresolved ref %s" reference))
        })
