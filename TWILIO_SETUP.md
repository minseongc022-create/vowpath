# Twilio 전화 AI (v3)

## 흐름

1. 고객이 **Twilio 번호**로 전화
2. AI 안내 → **음성으로 문제 설명**
3. OpenAI가 **Job Card** 생성
4. (Jobber 연결됨) **Jobber Request** 자동 생성
5. 대시보드 **인바운드 통화** 목록에 표시

## 1. Twilio 계정

1. [twilio.com](https://www.twilio.com) 가입
2. **Phone Numbers** → 번호 구매 (미국)
3. **Account SID** / **Auth Token** 복사

## 2. `.env.local`

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# 로컬 테스트: ngrok URL (https)
TWILIO_WEBHOOK_BASE_URL=https://xxxx.ngrok-free.app

# 가입 후 DB/KV의 user id — 대시보드 개발자 도구 또는 data/users.json
TWILIO_DEFAULT_USER_ID=your-user-uuid
```

## 2.5 SMS Geo permissions (필수)

문자가 `21408 Permission to send an SMS has not been enabled for the region` 로 실패하면:

1. [Twilio Console → Messaging → Geo permissions](https://console.twilio.com/us1/develop/sms/settings/geo-permissions)
2. **United States** (또는 **United States/Canada**) → **Enable** SMS
3. 저장 후 `npm run sms:diagnose` 로 테스트

업체 알림 번호는 **미국 +1** 만 사용합니다 (`설정 → 연락처`). 한국 `010` 번호는 저장·알림 대상이 아닙니다.

## 2.6 한국 번호로 로컬 테스트 (개발만)

`.env.local` (Vercel 프로덕션에는 넣지 마세요):

```env
SMS_DEV_PREVIEW=1
SMS_ALLOW_KR_RECIPIENTS=1
```

- `SMS_DEV_PREVIEW=1` — 지금: 실제 문자 안 보냄, 앱·이메일만 테스트
- `SMS_ALLOW_KR_RECIPIENTS=1` — 설정에 010 저장·시뮬레이션 콜백 허용
- 업그레이드 후: `SMS_DEV_PREVIEW` 제거, Geo US·KR, Verified 010 → `node scripts/sms-diagnose.mjs +8210…`

## 3. ngrok (로컬만)

Twilio는 공개 URL이 필요합니다.

```powershell
ngrok http 3000
```

→ `https://....ngrok-free.app` 을 `TWILIO_WEBHOOK_BASE_URL` 에 넣기

## 4. Twilio 콘솔 — Voice Webhook

해당 번호 → **Voice Configuration**:

- **A call comes in**: Webhook, POST  
  `https://YOUR-NGROK-URL/api/twilio/voice`

## 5. 테스트

1. `npm run dev`
2. 본인 휴대폰에서 Twilio 번호로 전화
3. 영어로 HVAC 문제 설명
4. 대시보드 → **인바운드 통화** 확인

## 비용

- Twilio: 번호 월 ~$1 + 통화 분당 과금
- OpenAI: 통화당 Job Card 1회

앱이 **자동으로 돈을 빼지 않습니다.** Twilio/OpenAI 계정에만 청구됩니다.

---

## Approved 고객 SMS — 로컬에서 실제 1통 테스트

Trial 계정은 **Verified(인증된) 번호로만** 문자를 보낼 수 있습니다.

### 1) Twilio 콘솔

1. [twilio.com/console](https://www.twilio.com/console) → **Phone Numbers** → 미국 번호 구매
2. **Account SID**, **Auth Token** 복사
3. **Phone Numbers → Manage → Verified Caller IDs** 에서  
   **문자를 받을 본인 휴대폰** 인증 (SMS 테스트 수신 번호)

### 2) `.env.local`

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

AUTH_SECRET=아무-긴-랜덤-문자열
TWILIO_DEFAULT_USER_ID=가입-후-유저-uuid
```

로컬 KV 없이도 `data/` JSON으로 동작합니다. (Vercel 배포 시 KV 연결)

### 3) 서버 실행

```powershell
npm run dev
```

`.env.local` 수정 후에는 **서버를 껐다가 다시** `npm run dev`.

### 4) 요청 1건 만들기 (시뮬레이션)

1. 브라우저에서 로그인 → 대시보드
2. 개발자 도구 또는 API로 시뮬레이션 (고객 번호 = Verified 번호):

```powershell
# PowerShell — YOUR_PHONE 은 Twilio에 인증한 E.164 (예: +821012345678)
Invoke-RestMethod -Uri "http://localhost:3000/api/dev/simulate-call" -Method POST `
  -ContentType "application/json" `
  -Body '{"callbackPhone":"YOUR_PHONE"}' `
  -WebSession $session
```

또는 대시보드 **통화 시뮬레이션** 버튼만 쓰면 기본 번호 `+15125550100` 이 저장됩니다.  
그 번호도 Twilio Verified에 넣거나, 위처럼 `callbackPhone` 을 넣으세요.

### 5) Approve → 고객 문자

1. **Bookings** → 방금 생긴 요청 → 상세
2. **Approve** 클릭 (또는 업체 번호로 Twilio 번호에 `1` 문자)
3. **Verified 번호** 휴대폰에 승인 안내 SMS 수신

문구 예: `{업체명}: Your service request was approved. We will contact you to schedule.`

### 6) 안 될 때 체크

| 증상 | 확인 |
|------|------|
| 터미널만 찍히고 폰에 안 옴 | `.env.local` 3개 Twilio 값 + 서버 재시작 |
| `21211` / invalid | `callbackPhone` 이 E.164 (`+1...` / `+82...`) |
| Trial 제한 | 수신 번호가 **Verified Caller IDs** 에 있는지 |
| Approve 했는데 무반응 | 통화 기록에 callback 번호 있는지, Settings → Ops failures |

Twilio 미설정 시에는 문자 대신 터미널에만  
`[customer-sms] customer_approved → +1...: ...` 로그가 나옵니다 (가짜 발송).
