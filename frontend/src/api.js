// 백엔드 API 호출 헬퍼
// 개발: VITE_API_URL 비어있음 → '/api/...' 상대경로 (vite 프록시가 4000으로 전달)
// 배포: VITE_API_URL = 백엔드 주소 → 절대경로로 호출
const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청에 실패했어요.');
  return data;
}

export const api = {
  createUser: (nickname) =>
    request('/api/users', { method: 'POST', body: JSON.stringify({ nickname }) }),

  getStats: () => request('/api/bottles/stats'),

  throwBottle: (authorId, content, mood) =>
    request('/api/bottles', {
      method: 'POST',
      body: JSON.stringify({ authorId, content, mood }),
    }),

  pickBottle: (userId) =>
    request('/api/bottles/pick', { method: 'POST', body: JSON.stringify({ userId }) }),

  myBottles: (userId) => request(`/api/bottles/mine?userId=${userId}`),

  inbox: (userId) => request(`/api/bottles/inbox?userId=${userId}`),

  getBottle: (id) => request(`/api/bottles/${id}`),

  addReply: (bottleId, authorId, content) =>
    request(`/api/bottles/${bottleId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ authorId, content }),
    }),
};
