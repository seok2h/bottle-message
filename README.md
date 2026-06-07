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
├── backend/             # Express + node-postgres (쿼리·트랜잭션)
│   └── src/
│       ├── index.js     #   서버 진입점
│       ├── db.js        #   pg 연결 풀
│       └── routes/      #   users · bottles · replies
├── frontend/            # React + Vite (UI)                       [예정]
├── scripts/             # 보조 스크립트 (DB 시드 재적용 등)
├── docker-compose.yml   # 로컬 개발용 PostgreSQL
└── README.md
```
> 프론트엔드 / 백엔드 / 데이터베이스를 디렉토리로 명확히 분리한 3계층 구조.

## 로컬 실행

### 1) 데이터베이스
```bash
docker compose up -d        # PostgreSQL 기동 (첫 기동 시 db/*.sql 자동 적용)
docker compose down         # 중지
docker compose down -v      # 데이터까지 초기화 (다시 up 하면 재초기화)
```
접속 정보: `localhost:5432` / DB `bottle` / 사용자 `bottle` / 비밀번호 `bottle_dev_pw`
> 시드만 다시 적용하려면: `./scripts/init-db.ps1` (Windows) 또는 `./scripts/init-db.sh`

### 2) 백엔드
```bash
cd backend
cp .env.example .env        # Windows: Copy-Item .env.example .env
npm install
npm run dev                 # http://localhost:4000 (자동 재시작)
```

## API 요약
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET  | `/api/health` | 서버/DB 상태 |
| POST | `/api/users` | 닉네임으로 사용자 생성 |
| POST | `/api/bottles` | 병 던지기 |
| POST | `/api/bottles/pick` | **병 줍기 (트랜잭션)** |
| GET  | `/api/bottles/stats` | 바다 현황 + 감정별 통계 |
| GET  | `/api/bottles/mine?userId=` | 내가 던진 병 + 상태 |
| GET  | `/api/bottles/inbox?userId=` | 내가 주운 편지함 |
| GET  | `/api/bottles/:id` | 병 상세 + 답장 스레드 |
| POST | `/api/bottles/:id/replies` | 답장 달기 |

## 기술 스택
| 영역 | 기술 |
|---|---|
| Database | PostgreSQL 18 (로컬: Docker / 배포: Neon) |
| Backend | Node.js + Express + node-postgres (생 SQL) |
| Frontend | React + Vite |
| 배포 | Vercel(프론트) · Render(백) · Neon(DB) — 전부 무료 티어 |
