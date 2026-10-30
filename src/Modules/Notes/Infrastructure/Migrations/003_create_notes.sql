-- 文件职责：Notes 迁移 003_create_notes 创建 notes 表及主键、标题、正文和时间列，并建立 ix_notes_created_at_id 复合降序索引，为 Notes 分页与排序提供结构基础，语句顺序保持原样。
-- 版本 003_create_notes 由文件名确定，按版本顺序执行并记录到 schema_migrations 以保证幂等；以下 SQL 语句保持原样。
CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    body TEXT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX ix_notes_created_at_id ON notes(created_at DESC, id DESC);
