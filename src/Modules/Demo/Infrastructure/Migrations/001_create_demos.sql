-- 文件职责：Demo 迁移 001_create_demos 创建 demos 表及其主键、非空名称、描述与时间列，并建立名称 COLLATE NOCASE 的唯一索引 ux_demos_name，SQL 语句保持原样，迁移版本名由文件名提供且本文件不包含回滚语句。
-- 版本 001_create_demos 由文件名确定，按版本顺序执行并记录到 schema_migrations 以保证幂等；以下 SQL 语句保持原样。
CREATE TABLE demos (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    description TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_demos_name ON demos(name COLLATE NOCASE);
