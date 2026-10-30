-- 文件职责：Demo 迁移 002_index_demos_created 在 demos 上建立 ix_demos_created_at_id 复合索引，按 created_at 与 id 双列降序排列，支撑分页列表的稳定倒序读取而不修改任何表结构。
-- 版本 002_index_demos_created 由文件名确定，按版本顺序执行并记录到 schema_migrations 以保证幂等；以下 SQL 语句保持原样。
CREATE INDEX ix_demos_created_at_id ON demos(created_at DESC, id DESC);
