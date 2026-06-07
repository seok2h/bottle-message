-- 벤치마크용 대량 시드
--   사용자 50,000명, 떠다니는 병 500,000개
-- 500,000개나 만드는 이유: 60초 동안 동시에 주워도 고갈되지 않도록 충분히 확보.
-- 재시드 안전: 먼저 비운다.

TRUNCATE replies, pickups, bottles, users RESTART IDENTITY CASCADE;

INSERT INTO users (nickname)
SELECT 'user_' || g
FROM generate_series(1, 50000) AS g;

INSERT INTO bottles (author_id, content, mood, status)
SELECT
  (random() * 49999 + 1)::int,        -- 1..50000 무작위 작성자
  'bench bottle ' || g,
  '기타',
  'floating'
FROM generate_series(1, 500000) AS g;
