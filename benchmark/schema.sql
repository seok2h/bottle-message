-- 벤치마크용 스키마 (앱과 동일한 4테이블 — 실제 설계를 그대로 측정)
-- 컨테이너 첫 기동 시 docker-entrypoint-initdb.d 로 자동 적용된다.

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  nickname   VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bottles (
  id         SERIAL PRIMARY KEY,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  mood       VARCHAR(20),
  status     VARCHAR(10) NOT NULL DEFAULT 'floating'
             CHECK (status IN ('floating', 'picked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pickups (
  id         SERIAL PRIMARY KEY,
  bottle_id  INTEGER NOT NULL UNIQUE REFERENCES bottles(id) ON DELETE CASCADE,
  picker_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  picked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replies (
  id         SERIAL PRIMARY KEY,
  bottle_id  INTEGER NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
