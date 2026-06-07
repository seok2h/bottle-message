// 사용자(users) 라우트 — 익명 닉네임 기반(비밀번호 없음)
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/users  { nickname }  → 닉네임으로 사용자 생성
router.post('/', async (req, res, next) => {
  try {
    const nickname = (req.body.nickname || '').trim();
    if (!nickname) return res.status(400).json({ error: '닉네임을 입력해 주세요.' });
    if (nickname.length > 30) return res.status(400).json({ error: '닉네임은 30자 이하여야 합니다.' });

    // [쿼리] INSERT 후 생성된 행 반환
    const result = await query(
      'INSERT INTO users (nickname) VALUES ($1) RETURNING id, nickname, created_at',
      [nickname]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id  → 사용자 정보 (재방문 시 신원 확인용)
router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '잘못된 사용자 번호입니다.' });
    const result = await query(
      'SELECT id, nickname, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
