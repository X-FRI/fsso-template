// 文件职责：Notes HTTP 测试，验证标题正文校验、创建与获取往返、Location 与 SQLite 实际行一致、迁移版本和表索引列结构，以及重启后仍能读取先前创建的笔记。
module Fsso.Notes.Tests.NotesTests

open System
open System.Net
open System.Threading
open System.Threading.Tasks
open Xunit
open Fsso.Database
open Fsso.Notes.Tests.Support

// 覆盖畸形 JSON、空请求体、空标题、缺标题字段、超长标题正文以及坏标识和不存在标识。
[<Fact>]
let ``ValidationAndMissingIdReturnUniformErrors`` () =
    withApp (fun client _ ->
        task {
            let! malformed = postJson client "/api/notes" "{"
            assertErrorShape HttpStatusCode.BadRequest malformed

            let! empty = postJson client "/api/notes" ""
            assertErrorShape HttpStatusCode.BadRequest empty

            let! blankTitle = postJson client "/api/notes" """{"title":"   "}"""
            assertErrorShape HttpStatusCode.BadRequest blankTitle

            let! missingTitle = postJson client "/api/notes" """{"body":"body"}"""
            assertErrorShape HttpStatusCode.BadRequest missingTitle

            let longTitle = String('t', 121)
            let! titleTooLong = postJson client "/api/notes" (sprintf """{"title":"%s"}""" longTitle)
            assertErrorShape HttpStatusCode.BadRequest titleTooLong

            let longBody = String('b', 4001)
            let! bodyTooLong = postJson client "/api/notes" (sprintf """{"title":"ok","body":"%s"}""" longBody)
            assertErrorShape HttpStatusCode.BadRequest bodyTooLong

            let! badId = client.GetAsync("/api/notes/not-a-guid")
            assertErrorShape HttpStatusCode.BadRequest badId

            let! missing = client.GetAsync(sprintf "/api/notes/%s" (Guid.NewGuid().ToString("D")))
            assertErrorShape HttpStatusCode.NotFound missing
        })

[<Fact>]
let ``CreateAndGetNoteHttpRoundTripPersistsInSqlite`` () =
    withApp (fun client db ->
        task {
            let! created = postNote client "  Round trip  " "  body text  "
            Assert.Equal(HttpStatusCode.Created, created.StatusCode)
            Assert.True(created.Headers.Location <> null)
            let note = readNote created
            Assert.Equal("Round trip", note.Title)
            Assert.Equal("body text", note.Body)
            Assert.False(String.IsNullOrWhiteSpace note.CreatedAt)
            Assert.Equal(sprintf "/api/notes/%s" note.Id, created.Headers.Location.ToString())

            // 创建后直接查询 SQLite 行，按字符串逐列核对标题、正文与 created_at；Location 已在前面单独断言，未做字节级或 Location 到数据库的联合比较。
            use connection = openConnection db
            use command = connection.CreateCommand()
            command.CommandText <- "SELECT title, body, created_at FROM notes WHERE id = $id;"
            command.Parameters.AddWithValue("$id", note.Id) |> ignore
            use! reader = command.ExecuteReaderAsync()
            let! hasRow = reader.ReadAsync()
            Assert.True(hasRow, "note row must exist in SQLite after HTTP create")
            Assert.Equal("Round trip", reader.GetString(0))
            Assert.Equal("body text", reader.GetString(1))
            Assert.Equal(note.CreatedAt, reader.GetString(2))

            Assert.Equal(1L, countNotes db)

            let! fetched = client.GetAsync(sprintf "/api/notes/%s" note.Id)
            Assert.Equal(HttpStatusCode.OK, fetched.StatusCode)
            let fetchedNote = readNote fetched
            Assert.Equal(note.Id, fetchedNote.Id)
            Assert.Equal("Round trip", fetchedNote.Title)
            Assert.Equal("body text", fetchedNote.Body)
        })

// 三个版本顺序固定，并核对 notes 表、时间索引和列顺序，防止后续迁移意外漂移。
[<Fact>]
let ``MigrationAddsNotesTableAndKeepsDemoMigrationVersions`` () =
    task {
        let db = newDbPath ()
        try
            migrate db

            let versions =
                Migrations.appliedVersions db CancellationToken.None
                |> fun work -> work.GetAwaiter().GetResult()

            Assert.Equal<string list>(
                [ "001_create_demos"; "002_index_demos_created"; "003_create_notes" ],
                versions
            )

            use connection = openConnection db
            use table = connection.CreateCommand()
            table.CommandText <- "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'notes';"
            Assert.Equal(1L, Convert.ToInt64(table.ExecuteScalar()))

            use index = connection.CreateCommand()
            index.CommandText <- "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'ix_notes_created_at_id';"
            Assert.Equal(1L, Convert.ToInt64(index.ExecuteScalar()))

            use columns = connection.CreateCommand()
            columns.CommandText <- "PRAGMA table_info(notes);"
            use! reader = columns.ExecuteReaderAsync()
            let names = ResizeArray<string>()
            let mutable reading = true
            while reading do
                let! hasRow = reader.ReadAsync()
                if hasRow then names.Add(reader.GetString(1)) else reading <- false
            Assert.Equal<string list>([ "id"; "title"; "body"; "created_at" ], List.ofSeq names)
        finally
            deleteDb db
    }

// 第一次宿主写入后释放，第二次宿主在相同库上读取，证明重启持久化。
[<Fact>]
let ``RestartPersistenceReadsNoteCreatedBeforeRestart`` () =
    task {
        let db = newDbPath ()
        try
            let mutable id = ""

            do!
                withAppOnDb db false (fun client _ ->
                    task {
                        let! response = postNote client "Before restart" "kept"
                        Assert.Equal(HttpStatusCode.Created, response.StatusCode)
                        id <- (readNote response).Id
                    })

            do!
                withAppOnDb db false (fun client _ ->
                    task {
                        let! response = client.GetAsync(sprintf "/api/notes/%s" id)
                        Assert.Equal(HttpStatusCode.OK, response.StatusCode)
                        Assert.Equal("Before restart", (readNote response).Title)
                    })
        finally
            deleteDb db
    }
