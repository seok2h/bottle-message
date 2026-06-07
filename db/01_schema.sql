-- =====================================================================
-- 유리병 편지 (Message in a Bottle) - 데이터베이스 스키마
-- DBMS: PostgreSQL 18
-- 컨테이너 첫 기동 시 자동 실행 (docker-entrypoint-initdb.d)
-- =====================================================================

-- 재실행 안전성을 위해 기존 테이블 제거 (의존 역순)
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS pickups CASCADE;
DROP TABLE IF EXISTS bottles CASCADE;
DROP TABLE IF EXISTS users   CASCADE;

-- ---------------------------------------------------------------------
-- users : 익명 닉네임 사용자
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  nickname   VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- bottles : 바다에 띄운 편지(병)
--   status = 'floating'(떠다니는 중) | 'picked'(주워짐)
-- ---------------------------------------------------------------------
CREATE TABLE bottles (
  id         SERIAL PRIMARY KEY,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  mood       VARCHAR(20),                       -- 감정 태그(위로/기쁨/고민 등)
  status     VARCHAR(10) NOT NULL DEFAULT 'floating'
             CHECK (status IN ('floating', 'picked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- pickups : 누가 어떤 병을 주웠는가
--   bottle_id UNIQUE -> 병 1개는 최대 1번만 주워짐 (트랜잭션과 이중 보장)
-- ---------------------------------------------------------------------
CREATE TABLE pickups (
  id         SERIAL PRIMARY KEY,
  bottle_id  INTEGER NOT NULL UNIQUE REFERENCES bottles(id) ON DELETE CASCADE,
  picker_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  picked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- replies : 주워진 병에 달린 답장(대화 스레드)
-- ---------------------------------------------------------------------
CREATE TABLE replies (
  id         SERIAL PRIMARY KEY,
  bottle_id  INTEGER NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 조회 성능 인덱스
CREATE INDEX idx_bottles_status  ON bottles(status);
CREATE INDEX idx_bottles_author  ON bottles(author_id);
CREATE INDEX idx_replies_bottle  ON replies(bottle_id);
CREATE INDEX idx_pickups_picker  ON pickups(picker_id);
