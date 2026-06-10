# 트랜잭션 벤치마크 (병 줍기)

유리병 편지의 핵심 트랜잭션인 **"병 줍기"**(`FOR UPDATE SKIP LOCKED`)를
[pgbench](https://www.postgresql.org/docs/current/pgbench.html)로 측정한다.
**격리수준(READ COMMITTED vs SERIALIZABLE)** 과 **동시성(10/50/100)** 에 따른
처리량(TPS)·지연(latency)·실패(serialization failure)를 비교한다.

> 참고: INU DB 과제 예시(`_projectmeta/Benchmark/`)의 방법론(pgbench, 동시성/격리수준
> 비교, reset 후 반복 측정)을 본 프로젝트의 트랜잭션에 맞게 적용했다.

## 구성
```
benchmark/
├── docker-compose.yml   # 전용 PostgreSQL(포트 5433, max_connections=300)
├── schema.sql           # 앱과 동일한 4테이블
├── seed.sql             # 사용자 5만 + 떠다니는 병 50만
├── workloads/
│   ├── pick.sql              # 병 줍기 (READ COMMITTED)
│   └── pick_serializable.sql # 병 줍기 (SERIALIZABLE)
├── run_benchmark.ps1    # 실행기 (Windows)
└── run_benchmark.sh     # 실행기 (macOS/Linux)
```

## 실행
```powershell
# Windows
./benchmark/run_benchmark.ps1            # 각 케이스 30초
./benchmark/run_benchmark.ps1 -Duration 60
```
```bash
# macOS / Linux
DURATION=30 ./benchmark/run_benchmark.sh
```
pgbench는 **컨테이너 안에서** 실행되므로 호스트에 별도 설치가 필요 없다.
각 케이스 실행 전 `reset`(모든 병을 floating 으로, pickups 비움)을 수행한다.

## 측정 워크로드 (1 트랜잭션)
```sql
BEGIN;
WITH cand AS (                       -- 떠다니는 병 1개를 잠그며 선택
  SELECT id FROM bottles
  WHERE id = :bid AND status = 'floating'
  FOR UPDATE SKIP LOCKED             -- 다른 트랜잭션이 잡은 행은 건너뜀
), claimed AS (
  UPDATE bottles SET status = 'picked'
  WHERE id IN (SELECT id FROM cand)
  RETURNING id
)
INSERT INTO pickups (bottle_id, picker_id)  -- 줍기 기록
SELECT id, :uid FROM claimed;
COMMIT;
```

## 결과 (각 케이스 30초, 1회 측정 예시)
> 측정 환경에 따라 절대 수치는 달라질 수 있으나 **경향성**은 동일하게 재현된다.

| 격리수준 | 동시성 | TPS | 평균 지연(ms) | 실패(직렬화) |
|---|---:|---:|---:|---:|
| READ COMMITTED | 10 | 8,280 | 1.21 | 0 |
| READ COMMITTED | 50 | 14,595 | 3.43 | 0 |
| READ COMMITTED | 100 | 13,642 | 7.33 | 0 |
| SERIALIZABLE | 10 | 5,981 | 1.67 | 23 |
| SERIALIZABLE | 50 | 11,328 | 4.41 | 118 |
| SERIALIZABLE | 100 | 10,305 | 9.69 | 311 |

## 해석 (PPT 포인트)
1. **READ COMMITTED + `SKIP LOCKED` 는 정합성·성능 모두 우수**하다.
   모든 동시성에서 **실패가 0** — `SKIP LOCKED` 덕에 같은 병 경합 시 락 대기 없이
   다른 병으로 넘어가기 때문. TPS는 10→50 에서 상승(8.3k→14.6k) 후 50→100 에서
   소폭 하락(13.6k) → 약 50접속에서 처리 포화점에 도달.
2. **SERIALIZABLE 은 더 안전하지만 비용이 크다.**
   - 모든 동시성에서 TPS가 더 낮고 지연이 더 높다.
   - **직렬화 실패(serialization failure)** 가 동시성에 비례해 급증(23→118→311).
3. **결론**: 본 서비스의 "병 줍기"는 중복 줍기만 막으면 충분하므로
   기본 격리수준(READ COMMITTED) + `FOR UPDATE SKIP LOCKED` 조합이
   **정합성과 성능을 모두 만족**한다. SERIALIZABLE은 과도한 격리로 불필요한 비용 발생.

## 비고
- `results/` 폴더의 원시 pgbench 출력은 `.gitignore` 처리(실행 시마다 생성).
- 동시성→스레드 매핑: c=10/j=4, c=50/j=8, c=100/j=16.
