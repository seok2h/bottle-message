-- 워크로드: "병 줍기" 트랜잭션 (READ COMMITTED = PostgreSQL 기본 격리수준)
--
-- 앱의 핵심 트랜잭션과 동일한 의미: 떠다니는 병 하나를 원자적으로 집어
-- 상태를 picked 로 바꾸고 pickups 에 기록한다.
-- 동시성 제어: FOR UPDATE SKIP LOCKED — 다른 트랜잭션이 잡은 행은 건너뛴다.
-- (참고자료처럼 무작위 id 를 타깃으로 선택 → 트랜잭션/락 동작 자체를 측정)

\set bid random(1, 500000)
\set uid random(1, 50000)

BEGIN;

WITH cand AS (
  SELECT id FROM bottles
  WHERE id = :bid AND status = 'floating'
  FOR UPDATE SKIP LOCKED
), claimed AS (
  UPDATE bottles SET status = 'picked'
  WHERE id IN (SELECT id FROM cand)
  RETURNING id
)
INSERT INTO pickups (bottle_id, picker_id)
SELECT id, :uid FROM claimed;

COMMIT;
