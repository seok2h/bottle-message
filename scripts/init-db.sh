#!/usr/bin/env bash
# DB 시드 재적용 스크립트 (macOS / Linux)
# 보통은 'docker compose up -d' 첫 기동 시 db/*.sql 이 자동 적용되므로 불필요하다.
# 볼륨을 지우지 않고 스키마/시드만 다시 적용하고 싶을 때 사용한다.
#
#   ./scripts/init-db.sh
set -euo pipefail

container="bottle_db"
db_dir="$(cd "$(dirname "$0")/../db" && pwd)"

echo "DB가 준비될 때까지 대기..."
for _ in $(seq 1 15); do
  if docker exec "$container" pg_isready -U bottle -d bottle >/dev/null 2>&1; then break; fi
  sleep 2
done

for file in 01_schema.sql 02_seed.sql; do
  echo "적용 중: $file"
  docker cp "$db_dir/$file" "$container:/tmp/$file"
  docker exec "$container" psql -U bottle -d bottle -v ON_ERROR_STOP=1 -f "/tmp/$file"
done

echo
echo "완료. 적용 결과:"
docker exec "$container" psql -U bottle -d bottle -c "SELECT status, count(*) AS bottles FROM bottles GROUP BY status;"
