import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

const MOODS = ['고민', '기쁨', '잔잔', '위로', '기타'];

// localStorage 에 저장된 사용자(닉네임 기반)를 불러온다
function loadUser() {
  try {
    return JSON.parse(localStorage.getItem('bottle_user') || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  if (!user) return <Join onJoin={setUser} />;
  return <Main user={user} onLogout={() => { localStorage.removeItem('bottle_user'); setUser(null); }} />;
}

// ── 입장(닉네임) 화면 ─────────────────────────────────────────────
function Join({ onJoin }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await api.createUser(nickname.trim());
      localStorage.setItem('bottle_user', JSON.stringify(u));
      onJoin(u);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen center">
      <div className="card join-card">
        <div className="logo">🍾</div>
        <h1>유리병 편지</h1>
        <p className="subtitle">바다에 편지를 띄우고,<br />누군가의 편지를 주워보세요.</p>
        <form onSubmit={submit}>
          <input
            className="input"
            placeholder="사용할 닉네임"
            value={nickname}
            maxLength={30}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button className="btn primary" disabled={loading || !nickname.trim()}>
            {loading ? '들어가는 중…' : '바다로 들어가기'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────
function Main({ user, onLogout }) {
  const [tab, setTab] = useState('sea');
  const [openBottleId, setOpenBottleId] = useState(null);

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand">🍾 유리병 편지</div>
        <div className="me">
          <span><b>{user.nickname}</b> 님</span>
          <button className="btn ghost small" onClick={onLogout}>나가기</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'sea' ? 'tab on' : 'tab'} onClick={() => setTab('sea')}>🌊 바다</button>
        <button className={tab === 'mine' ? 'tab on' : 'tab'} onClick={() => setTab('mine')}>📨 내가 던진 병</button>
        <button className={tab === 'inbox' ? 'tab on' : 'tab'} onClick={() => setTab('inbox')}>💌 편지함</button>
      </nav>

      <main className="content">
        {tab === 'sea' && <Sea user={user} onOpen={setOpenBottleId} />}
        {tab === 'mine' && <MyBottles user={user} onOpen={setOpenBottleId} />}
        {tab === 'inbox' && <Inbox user={user} onOpen={setOpenBottleId} />}
      </main>

      {openBottleId && (
        <BottleModal bottleId={openBottleId} user={user} onClose={() => setOpenBottleId(null)} />
      )}
    </div>
  );
}

// ── 바다: 던지기 + 줍기 ──────────────────────────────────────────
function Sea({ user, onOpen }) {
  const [stats, setStats] = useState(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('고민');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await api.getStats()); } catch { /* noop */ }
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const throwBottle = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await api.throwBottle(user.id, content.trim(), mood);
      setContent('');
      setMsg('🍾 편지를 담은 병을 바다에 띄웠어요.');
      loadStats();
    } catch (err) { setMsg('⚠️ ' + err.message); }
    finally { setBusy(false); }
  };

  const pick = async () => {
    setBusy(true); setMsg('');
    try {
      const bottle = await api.pickBottle(user.id);
      onOpen(bottle.id); // 주운 병 열기
      loadStats();
    } catch (err) { setMsg('⚠️ ' + err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="col">
      <div className="card sea-status">
        <div className="big">🌊 {stats ? stats.floating : '…'}</div>
        <div>지금 바다에 떠다니는 병</div>
        <button className="btn primary wide" disabled={busy} onClick={pick}>
          🫙 떠다니는 병 줍기
        </button>
      </div>

      <form className="card" onSubmit={throwBottle}>
        <h3>✍️ 편지 쓰기</h3>
        <textarea
          className="input area"
          placeholder="모르는 누군가에게 닿을 한마디…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="row">
          <select className="input" value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn primary" disabled={busy || !content.trim()}>병 띄우기</button>
        </div>
      </form>

      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}

// ── 내가 던진 병 ─────────────────────────────────────────────────
function MyBottles({ user, onOpen }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.myBottles(user.id).then(setList).catch(() => setList([])); }, [user.id]);

  if (!list) return <p className="muted">불러오는 중…</p>;
  if (list.length === 0) return <Empty text="아직 던진 병이 없어요. 바다에서 편지를 띄워보세요." />;

  return (
    <div className="col">
      {list.map((b) => (
        <button key={b.id} className="card item" onClick={() => onOpen(b.id)}>
          <div className="item-top">
            <span className={`badge ${b.status}`}>{b.status === 'picked' ? '주워짐' : '떠다니는 중'}</span>
            {b.mood && <span className="mood">#{b.mood}</span>}
          </div>
          <p className="preview">{b.content}</p>
          {b.status === 'picked' && (
            <p className="muted small">📬 {b.picker_nickname} 님이 주웠어요</p>
          )}
        </button>
      ))}
    </div>
  );
}

// ── 편지함(내가 주운 병) ─────────────────────────────────────────
function Inbox({ user, onOpen }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.inbox(user.id).then(setList).catch(() => setList([])); }, [user.id]);

  if (!list) return <p className="muted">불러오는 중…</p>;
  if (list.length === 0) return <Empty text="아직 주운 편지가 없어요. 바다에서 병을 주워보세요." />;

  return (
    <div className="col">
      {list.map((b) => (
        <button key={b.id} className="card item" onClick={() => onOpen(b.id)}>
          <div className="item-top">
            <span className="from">✉️ {b.author_nickname}</span>
            {b.mood && <span className="mood">#{b.mood}</span>}
          </div>
          <p className="preview">{b.content}</p>
        </button>
      ))}
    </div>
  );
}

// ── 병 상세 + 답장(대화) 모달 ────────────────────────────────────
function BottleModal({ bottleId, user, onClose }) {
  const [bottle, setBottle] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setBottle(await api.getBottle(bottleId)); } catch (e) { setErr(e.message); }
  }, [bottleId]);
  useEffect(() => { load(); }, [load]);

  const sendReply = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.addReply(bottleId, user.id, text.trim());
      setText('');
      load();
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        {!bottle ? (
          <p className="muted">불러오는 중…</p>
        ) : (
          <>
            <div className="modal-head">
              <span className="from">✉️ {bottle.author_nickname}</span>
              {bottle.mood && <span className="mood">#{bottle.mood}</span>}
            </div>
            <p className="letter">{bottle.content}</p>

            <div className="thread">
              {(bottle.replies || []).map((r) => (
                <div key={r.id} className={`bubble ${r.author_id === user.id ? 'me' : ''}`}>
                  <div className="bubble-name">{r.author_nickname}</div>
                  <div>{r.content}</div>
                </div>
              ))}
              {(bottle.replies || []).length === 0 && bottle.status === 'picked' && (
                <p className="muted small">아직 답장이 없어요. 첫 답장을 남겨보세요.</p>
              )}
            </div>

            {bottle.status === 'picked' ? (
              <form className="reply" onSubmit={sendReply}>
                <input
                  className="input"
                  placeholder="답장 쓰기…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button className="btn primary" disabled={busy || !text.trim()}>보내기</button>
              </form>
            ) : (
              <p className="muted small">이 병은 아직 바다를 떠다니고 있어요.</p>
            )}
            {err && <p className="error">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="card empty"><p className="muted">{text}</p></div>;
}
