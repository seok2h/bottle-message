// PostgreSQL 연결 풀 (node-postgres)
// - 로컬: PGHOST/PGPORT/... 개별 환경변수 사용
// - 배포(Neon 등): DATABASE_URL 이 있으면 그것을 우선 사용 (SSL 필요)
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const useUrl = !!process.env.DATABASE_URL;

export const pool = new Pool(
  useUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        // Neon 등 관리형 PostgreSQL은 SSL 요구. 자체서명 인증서 허용.
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'bottle',
        password: process.env.PGPASSWORD || 'bottle_dev_pw',
        database: process.env.PGDATABASE || 'bottle',
      }
);

// 유휴 커넥션이 끊겨도(배포 환경에서 흔함) 프로세스가 죽지 않도록 에러를 흡수
pool.on('error', (err) => {
  console.error('예상치 못한 DB 풀 에러:', err.message);
});

// 쿼리 헬퍼: 라우트에서 await query('SELECT ...', [params]) 형태로 사용
export const query = (text, params) => pool.query(text, params);
