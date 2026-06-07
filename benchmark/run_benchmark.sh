#!/usr/bin/env bash
# 유리병 편지 — 트랜잭션 벤치마크 실행기 (macOS / Linux)
#   ./benchmark/run_benchmark.sh            # 기본 30초
#   DURATION=60 ./benchmark/run_benchmark.sh
set -euo pipefail

ct="bottle_benchdb"
dir="$(cd "$(dirname "$0")" && pwd)"
dur="${DURATION:-30}"
mkdir -p "$dir/results"

psql() { docker exec "$ct" psql -U bench -d bench -v ON_ERROR_STOP=1 -t -A -c "$1"; }
reset() { psql "UPDATE bottles SET status='floating'; TRUNCATE pickups RESTART IDENTITY;" >/dev/null; }

echo "[1/4] 벤치 DB 기동..."
docker compose -f "$dir/docker-compose.yml" up -d >/dev/null
for _ in $(seq 1 30); do docker exec "$ct" pg_isready -U bench -d bench >/dev/null 2>&1 && break; sleep 2; done

echo "[2/4] 시드 확인/적용 (사용자 5만, 병 50만)..."
cnt="$(psql 'SELECT count(*) FROM bottles' | tr -d '[:space:]')"
if [ "$cnt" = "0" ]; then
  docker cp "$dir/seed.sql" "$ct:/tmp/seed.sql"
  docker exec "$ct" psql -U bench -d bench -v ON_ERROR_STOP=1 -f /tmp/seed.sql
else
  echo "  이미 시드됨(병 $cnt 개) — 건너뜀"
fi

echo "[3/4] 워크로드 복사..."
docker cp "$dir/workloads/pick.sql" "$ct:/tmp/pick.sql"
docker cp "$dir/workloads/pick_serializable.sql" "$ct:/tmp/pick_serializable.sql"

run_case() {
  local label="$1" file="$2"
  for pair in "10 4" "50 8" "100 16"; do
    set -- $pair; local c="$1" j="$2"
    reset
    printf "  - %-14s c=%-3s j=%-2s T=%ss ... " "$label" "$c" "$j" "$dur"
    out="$(docker exec "$ct" pgbench -U bench -d bench -f "/tmp/$file" -n -c "$c" -j "$j" -T "$dur" 2>&1)"
    echo "$out" > "$dir/results/${label}_c${c}.txt"
    tps="$(echo "$out"  | grep -oE 'tps = [0-9.]+' | head -1 | grep -oE '[0-9.]+')"
    echo "tps=$tps"
  done
}

echo "[4/4] 벤치마크 실행 (각 케이스 ${dur}s)"
echo "=== READ COMMITTED ==="; run_case "READ_COMMITTED" "pick.sql"
echo "=== SERIALIZABLE ===";   run_case "SERIALIZABLE" "pick_serializable.sql"
echo "원시 결과: benchmark/results/*.txt"
