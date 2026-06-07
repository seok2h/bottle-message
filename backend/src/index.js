// 유리병 편지 백엔드 진입점 (Express)
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { pool } from './db.js';
import usersRouter from './routes/users.js';
import bottlesRouter from './routes/bottles.js';
import repliesRouter from './routes/replies.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// CORS: 허용할 프론트엔드 주소 (쉼표로 여러 개)
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json());

// 헬스체크 (배포 상태 확인용)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch {
    res.status(500).json({ ok: false, db: 'error' });
  }
});

// 라우트 등록
app.use('/api/users', usersRouter);
app.use('/api/bottles', bottlesRouter);
app.use('/api/bottles', repliesRouter); // /api/bottles/:id/replies

// 공통 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`🍾 백엔드 실행 중: http://localhost:${PORT}`);
});
