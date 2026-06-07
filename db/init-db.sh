#!/usr/bin/env bash
# DB 초기화 스크립트 (macOS / Linux)
# 실행 중인 bottle_db 컨테이너에 스키마 + 시드를 적용한다.
#
#   docker compose up -d      # 먼저 컨테이너 기동
#   ./db/init-db.sh           # 그 다음 이 스크립트 실행
set -euo pipefail

container="bottle_db"
dir="$(cd "$(dirname "$0")" && pwd)"

echo "DB가 준비될 때까지 대기..."
for _ in $(seq 1 15); do
  if docker exec "$container" pg_isready -U bottle -d bottle >/dev/null 2>&1; then break; fi
  sleep 2
done

for file in 01_schema.sql 02_seed.sql; do
  echo "적용 중: $file"
  docker cp "$dir/$file" "$container:/tmp/$file"
  docker exec "$container" psql -U bottle -d bottle -v ON_ERROR_STOP=1 -f "/tmp/$file"
done

echo
echo "완료. 적용 결과:"
docker exec "$container" psql -U bottle -d bottle -c "SELECT status, count(*) AS bottles FROM bottles GROUP BY status;"
