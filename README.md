# 🍾 유리병 편지 (Message in a Bottle)

누군지 모르는 사람에게 편지를 띄우고, 누군지 모르는 사람의 편지를 줍는
익명·랜덤·느린 소통 서비스. **데이터베이스 과제 프로젝트** (PostgreSQL).

## 학습 목표 매핑
- **릴레이션(Relation)**: `users` · `bottles` · `pickups` · `replies` 4개 테이블 + 외래키 관계
- **쿼리(Query)**: JOIN/집계로 편지함·대화 스레드·통계 조회
- **트랜잭션(Transaction)**: "병 줍기" 시 동시성 제어 (`FOR UPDATE SKIP LOCKED`)로 중복 줍기 방지

## 프로젝트 구조
```
databaseproject/
├── db/                  # PostgreSQL 스키마 & 시드 (릴레이션 정의)
│   ├── 01_schema.sql
│   └── 02_seed.sql
├── backend/             # Express + node-postgres (쿼리·트랜잭션)  [예정]
├── frontend/            # React + Vite (UI)                       [예정]
├── docker-compose.yml   # 로컬 개발용 PostgreSQL
└── README.md
```
> 프론트엔드 / 백엔드 / 데이터베이스를 디렉토리로 명확히 분리한 3계층 구조.

## 로컬 실행 (DB)
```bash
docker compose up -d        # 1) PostgreSQL 컨테이너 기동
./db/init-db.ps1            # 2) 스키마 + 시드 적용 (Windows). macOS/Linux: ./db/init-db.sh

docker compose down         # 중지
docker compose down -v      # 데이터까지 초기화 (이후 init-db 다시 실행)
```
접속 정보: `localhost:5432` / DB `bottle` / 사용자 `bottle` / 비밀번호 `bottle_dev_pw`

> 스키마/시드는 `docker cp` 기반 `init-db` 스크립트로 적용한다. 자동 마운트
> (`docker-entrypoint-initdb.d`)를 쓰지 않는 이유는, 프로젝트가 Google Drive 등
> 가상 드라이브에 있을 때 바인드 마운트가 컨테이너에 비어 보이는 문제를 피하기 위함이다.

## 기술 스택
| 영역 | 기술 |
|---|---|
| Database | PostgreSQL 18 (로컬: Docker / 배포: Neon) |
| Backend | Node.js + Express + node-postgres (생 SQL) |
| Frontend | React + Vite |
| 배포 | Vercel(프론트) · Render(백) · Neon(DB) — 전부 무료 티어 |
