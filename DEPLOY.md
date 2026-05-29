# Vowpath 배포 (Vercel) + Twilio 실전 전화

## 요약

1. Twilio **Upgrade** ($20)
2. GitHub → Vercel 배포
3. 환경 변수 + **Upstash Redis (KV)**
4. Jobber Redirect URI / Twilio 웹훅 등록
5. 한국 번호 **Verified** → `+1 225 529 1680` 전화 테스트

---

## 1. Twilio Upgrade (직접)

1. https://console.twilio.com → **Upgrade**
2. 카드 등록 + **$20** 충전
3. **Verified Caller IDs** → South Korea → `1055969438` → **전화(부르다)** 인증  
   → 목록에 **`+821055969438`** (010 없이)

---

## 2. GitHub

```powershell
cd "c:\Users\최민성\Documents\새 폴더"
git init
git add .
git commit -m "Vowpath deploy"
```

GitHub 새 repo → push:

```powershell
git remote add origin https://github.com/YOUR_USER/vowpath.git
git branch -M main
git push -u origin main
```

---

## 3. Vercel

1. https://vercel.com → **Add New Project** → repo 선택 → **Deploy**
2. **Storage** → **Upstash Redis** 연결 (필수: 로그인·통화·Jobber 토큰 저장)
3. **Settings → Environment Variables** (Production):

| 변수 | 값 |
|------|-----|
| `NEXT_PUBLIC_BETA` | `true` |
| `NEXT_PUBLIC_APP_URL` | 배포 URL (예: `https://vowpath-xxx.vercel.app`) |
| `AUTH_SECRET` | 32자+ 랜덤 |
| `OPENAI_API_KEY` | `sk-...` |
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | (콘솔) |
| `TWILIO_PHONE_NUMBER` | `+12255291680` |
| `TWILIO_DEFAULT_USER_ID` | `61136f5f-69fc-481e-8585-e5623c67c740` |
| `JOBBER_CLIENT_ID` | (기존) |
| `JOBBER_CLIENT_SECRET` | (기존) |
| `JOBBER_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api/jobber/callback` |

`TWILIO_WEBHOOK_BASE_URL` 은 **비워도 됨** — `NEXT_PUBLIC_APP_URL` 또는 Vercel URL 자동 사용.

4. **Redeploy** (환경 변수 저장 후)

---

## 4. Jobber

Jobber Developer → Redirect URI에 추가:

`https://YOUR-APP.vercel.app/api/jobber/callback`

---

## 5. Twilio Voice 웹훅

배포 URL 확정 후 **로컬 터미널**:

```powershell
cd "c:\Users\최민성\Documents\새 폴더"
# .env.local 에 TWILIO_WEBHOOK_BASE_URL=https://YOUR-APP.vercel.app 설정 후
npm run twilio:webhook
```

또는 배포 사이트 **로그인 → 설정 → 전화 → 웹훅 자동 등록**

Voice URL:

`https://YOUR-APP.vercel.app/api/twilio/voice`

---

## 6. 전화 테스트

1. Verified 된 **010** 으로 **`+1 225 529 1680`** 전화
2. **1** = 긴급 → 천천히 영어로 이름·주소·증상
3. https://YOUR-APP.vercel.app/dashboard → **인바운드 통화**
4. Twilio **Monitor → Calls** → `completed` 확인

---

## 7. 로컬 vs 배포

| | 로컬 | Vercel |
|--|------|--------|
| 전화 | `npm run tunnel` + dev 필요 | 터널 불필요 |
| 데이터 | `data/*.json` | **Redis/KV 필수** |
| 기능 추가 | 코드 수정 → push → 자동 재배포 | 동일 |

---

## 비용 (몰래 청구 없음)

- **Vercel**: 소규모 무료
- **Twilio**: Upgrade 크레딧 + 번호 월 ~$1.15 + 통화 분당
- **OpenAI**: Job Card당 소액
- **Vowpath**: 자동 결제 없음
