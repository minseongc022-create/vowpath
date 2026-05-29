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
