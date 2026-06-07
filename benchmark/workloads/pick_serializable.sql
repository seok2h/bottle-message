-- 워크로드: "병 줍기" 트랜잭션 (SERIALIZABLE = 가장 엄격한 격리수준)
--
-- pick.sql 과 로직은 동일하되 격리수준만 SERIALIZABLE 로 설정.
-- READ COMMITTED 대비 TPS/지연/직렬화 실패가 어떻게 달라지는지 비교한다.

\set bid random(1, 500000)
\set uid random(1, 50000)

BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

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
