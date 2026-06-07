// 병(bottles) 라우트 — 던지기 / 줍기(트랜잭션) / 내 병 / 편지함 / 상세
import { Router } from 'express';
import { pool, query } from '../db.js';

const router = Router();

// ---------------------------------------------------------------------
// GET /api/bottles/stats  → 바다 현황(떠다니는 병 수) + 감정별 통계
//   [쿼리] 집계(count) + GROUP BY
// ---------------------------------------------------------------------
router.get('/stats', async (_req, res, next) => {
  try {
    const floating = await query(
      "SELECT count(*)::int AS count FROM bottles WHERE status = 'floating'"
    );
    const moods = await query(
      `SELECT COALESCE(mood, '기타') AS mood, count(*)::int AS count
       FROM bottles
       GROUP BY mood
       ORDER BY count DESC`
    );
    res.json({ floating: floating.rows[0].count, moods: moods.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/bottles  { authorId, content, mood }  → 병 던지기
//   [쿼리] INSERT
// ---------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { authorId, content, mood } = req.body;
    if (!authorId) return res.status(400).json({ error: '로그인이 필요합니다.' });
    const text = (content || '').trim();
    if (!text) return res.status(400).json({ error: '편지 내용을 입력해 주세요.' });

    const result = await query(
      `INSERT INTO bottles (author_id, content, mood)
       VALUES ($1, $2, $3)
       RETURNING id, content, mood, status, created_at`,
      [authorId, text, mood || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/bottles/pick  { userId }  → 떠다니는 병 하나 줍기
//   ★ 핵심 트랜잭션 ★
//   동시에 같은 병을 주워도 한 명만 성공해야 한다.
//   FOR UPDATE SKIP LOCKED 로 행을 잠그며 선택(작업 큐 패턴).
// ---------------------------------------------------------------------
router.post('/pick', async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: '로그인이 필요합니다.' });

  const client = await pool.connect(); // 트랜잭션은 같은 커넥션에서 수행
  try {
    await client.query('BEGIN');

    // 1) 떠다니는 병 중 '내가 쓰지 않은' 것 하나를 잠그며 무작위 선택
    //    SKIP LOCKED: 다른 트랜잭션이 이미 잠근 행은 건너뛴다 → 충돌 없이 다른 병 확보
    const picked = await client.query(
      `SELECT id, content, mood
       FROM bottles
       WHERE status = 'floating' AND author_id <> $1
       ORDER BY random()
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
      [userId]
    );

    if (picked.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '지금은 주울 수 있는 병이 없어요. 잠시 후 다시 시도해 보세요.' });
    }

    const bottle = picked.rows[0];

    // 2) 상태 변경 + 줍기 기록 (pickups.bottle_id UNIQUE 가 이중 안전장치)
    await client.query("UPDATE bottles SET status = 'picked' WHERE id = $1", [bottle.id]);
    await client.query(
      'INSERT INTO pickups (bottle_id, picker_id) VALUES ($1, $2)',
      [bottle.id, userId]
    );

    await client.query('COMMIT');
    res.json({ id: bottle.id, content: bottle.content, mood: bottle.mood });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------
// GET /api/bottles/mine?userId=  → 내가 던진 병 + 현재 상태
//   [쿼리] LEFT JOIN (주워졌으면 누가/언제 주웠는지)
// ---------------------------------------------------------------------
router.get('/mine', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });

    const result = await query(
      `SELECT b.id, b.content, b.mood, b.status, b.created_at,
              p.picked_at,
              pu.nickname AS picker_nickname
       FROM bottles b
       LEFT JOIN pickups p ON p.bottle_id = b.id
       LEFT JOIN users   pu ON pu.id = p.picker_id
       WHERE b.author_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// GET /api/bottles/inbox?userId=  → 내가 주운 병들(편지함)
//   [쿼리] JOIN (pickups + bottles + 원작성자)
// ---------------------------------------------------------------------
router.get('/inbox', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });

    const result = await query(
      `SELECT b.id, b.content, b.mood, b.created_at,
              u.nickname AS author_nickname,
              p.picked_at
       FROM pickups p
       JOIN bottles b ON b.id = p.bottle_id
       JOIN users   u ON u.id = b.author_id
       WHERE p.picker_id = $1
       ORDER BY p.picked_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// GET /api/bottles/:id  → 병 1개 상세 + 답장 스레드
//   [쿼리] 병 + JOIN 으로 답장 목록
// ---------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const bottleRes = await query(
      `SELECT b.id, b.content, b.mood, b.status, b.created_at,
              b.author_id, u.nickname AS author_nickname
       FROM bottles b
       JOIN users u ON u.id = b.author_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (bottleRes.rowCount === 0) return res.status(404).json({ error: '병을 찾을 수 없습니다.' });

    const repliesRes = await query(
      `SELECT r.id, r.content, r.created_at, r.author_id, u.nickname AS author_nickname
       FROM replies r
       JOIN users u ON u.id = r.author_id
       WHERE r.bottle_id = $1
       ORDER BY r.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...bottleRes.rows[0], replies: repliesRes.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
