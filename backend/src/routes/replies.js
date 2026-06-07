// 답장(replies) 라우트 — 주워진 병에 대한 대화
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/bottles/:id/replies  { authorId, content }  → 답장 달기
//   규칙: 병이 'picked' 상태이고, 작성자가 (원작성자 또는 주운 사람)일 때만 허용.
//   [쿼리] 권한 확인을 위한 JOIN 후 INSERT
router.post('/:id/replies', async (req, res, next) => {
  try {
    const bottleId = req.params.id;
    if (!/^\d+$/.test(bottleId)) return res.status(400).json({ error: '잘못된 병 번호입니다.' });
    const { authorId, content } = req.body;
    if (!authorId) return res.status(400).json({ error: '로그인이 필요합니다.' });
    const text = (content || '').trim();
    if (!text) return res.status(400).json({ error: '답장 내용을 입력해 주세요.' });

    // 병의 원작성자 / 주운 사람 확인
    const auth = await query(
      `SELECT b.status, b.author_id, p.picker_id
       FROM bottles b
       LEFT JOIN pickups p ON p.bottle_id = b.id
       WHERE b.id = $1`,
      [bottleId]
    );
    if (auth.rowCount === 0) return res.status(404).json({ error: '병을 찾을 수 없습니다.' });

    const { status, author_id, picker_id } = auth.rows[0];
    if (status !== 'picked') {
      return res.status(400).json({ error: '아직 아무도 줍지 않은 병에는 답장할 수 없어요.' });
    }
    const uid = Number(authorId);
    if (uid !== author_id && uid !== picker_id) {
      return res.status(403).json({ error: '이 편지의 당사자만 답장할 수 있어요.' });
    }

    const result = await query(
      `INSERT INTO replies (bottle_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, author_id`,
      [bottleId, uid, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
