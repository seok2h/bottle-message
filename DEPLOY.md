# 배포 가이드 (무료, 신용카드 불필요)

구성: **Neon**(PostgreSQL) ← **Render**(백엔드) ← **Vercel**(프론트엔드)
모두 GitHub 로그인으로 가입 가능. 한 달 데모에 충분한 무료 티어.

```
사용자 ─▶ Vercel(프론트) ─▶ Render(백엔드 API) ─▶ Neon(PostgreSQL)
```

---

## 0) GitHub에 코드 올리기 (먼저)
Render/Vercel 은 GitHub 레포에서 코드를 가져온다.
1. github.com → New repository → 이름 예: `bottle-message` (Public) → 빈 레포 생성
2. 로컬에서:
   ```powershell
   git remote add origin https://github.com/<사용자명>/<레포명>.git
   git branch -M main
   git push -u origin main
   ```

## 1) Neon — PostgreSQL 만들기
1. https://neon.tech → Sign up (GitHub)
2. New Project 생성 → 리전 아무거나
3. **Connection string** 복사 (`postgresql://...@...neon.tech/...?sslmode=require`)
4. 스키마 + 시드 적용 (로컬 psql 사용):
   ```powershell
   psql "<Neon 연결문자열>" -f db/01_schema.sql
   psql "<Neon 연결문자열>" -f db/02_seed.sql
   ```
   (또는 Neon 웹 SQL Editor에 `db/01_schema.sql`, `db/02_seed.sql` 내용을 붙여넣기)

## 2) Render — 백엔드 배포
1. https://render.com → Sign up (GitHub)
2. New → **Blueprint** → 이 레포 선택 → `render.yaml` 자동 인식
   (또는 New → Web Service → 레포 선택 → Root Directory `backend`,
    Build `npm install`, Start `npm start`)
3. 환경변수 입력:
   - `DATABASE_URL` = Neon 연결 문자열
   - `CORS_ORIGIN` = (일단 비워두거나 `*`; 4단계 후 Vercel 주소로 갱신)
4. 배포 완료 후 URL 확인 (예: `https://bottle-backend.onrender.com`)
   - 헬스체크: 브라우저로 `<백엔드URL>/api/health` → `{"ok":true,"db":"connected"}`

## 3) Vercel — 프론트엔드 배포
1. https://vercel.com → Sign up (GitHub)
2. Add New → Project → 이 레포 선택
3. 설정:
   - **Root Directory** = `frontend`
   - Framework = Vite (자동 인식)
   - 환경변수: `VITE_API_URL` = 2단계의 백엔드 URL (예: `https://bottle-backend.onrender.com`)
4. Deploy → 프론트 URL 확인 (예: `https://bottle-message.vercel.app`)

## 4) CORS 마무리
1. Render 대시보드 → 백엔드 서비스 → Environment →
   `CORS_ORIGIN` = 3단계의 Vercel 주소 (예: `https://bottle-message.vercel.app`)
2. 저장 → 자동 재배포
3. Vercel 주소 접속 → 닉네임 입장 → 병 던지기/줍기 동작 확인 🎉

---

## 체크리스트
- [ ] GitHub push 완료
- [ ] Neon DB 생성 + 스키마/시드 적용
- [ ] Render 백엔드 배포 + `/api/health` OK
- [ ] Vercel 프론트 배포
- [ ] CORS_ORIGIN 갱신 후 실서비스 동작 확인

## 참고
- Render 무료 인스턴스는 유휴 시 잠들어 첫 요청이 느릴 수 있음(정상).
- 비밀값(`DATABASE_URL` 등)은 레포에 올리지 않고 각 플랫폼 환경변수로만 설정.
