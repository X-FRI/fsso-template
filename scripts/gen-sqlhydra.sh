#!/usr/bin/env bash
# 文件职责：重建 schema 数据库、执行全部迁移并调用 SqlHydra 生成 F# 表类型，最后用 git diff 拒绝未提交的生成差异，保证生成流程可复现。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export FSSO_DB_PATH="$ROOT/artifacts/schema.db"
rm -f "$FSSO_DB_PATH" "$FSSO_DB_PATH-shm" "$FSSO_DB_PATH-wal"

dotnet run --project src/Host -- --migrate-only
dotnet sqlhydra sqlite -t sqlhydra.toml --project src/Shared/Fsso.Database/Fsso.Database.fsproj

GENERATED="src/Shared/Fsso.Database/Generated/SqlHydra.fs"
TEMP="$ROOT/artifacts/.sqlhydra.generated.tmp"
mkdir -p "$ROOT/artifacts"
{
  printf '#nowarn "3261"\n#nowarn "1178"\n'
  cat "$GENERATED"
} > "$TEMP"
mv "$TEMP" "$GENERATED"

git diff --exit-code -- "$GENERATED"
