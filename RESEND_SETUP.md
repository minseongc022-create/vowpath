# 이메일 · 문자 인증 설정

회원가입·비밀번호 찾기 인증번호를 **실제로** 보내려면 아래를 설정하세요.

---

## 1. 이메일 (Resend) — 추천, 먼저

### 가입
1. https://resend.com 가입
2. **API Keys** → Create API Key → 복사 (`re_...`)

### Vercel 환경 변수
| 변수 | 값 |
|------|-----|
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | (선택) `Effiroad <onboarding@resend.dev>` |

**Redeploy** 필수.

### 테스트 (도메인 없이)
- 발신: `onboarding@resend.dev` (기본값)
- **Resend에 가입한 본인 이메일로만** 수신 가능
- 다른 이메일로 보내려면 Resend에서 **도메인 인증** 필요

### 로컬 (`.env.local`)
```env
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Effiroad <onboarding@resend.dev>
```
`npm run dev` 재시작 후 `/signup`에서 **본인 Resend 이메일**로 테스트.

---

## 2. 문자 (Twilio)

### Vercel 환경 변수
| 변수 | 값 |
|------|-----|
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | (콘솔) |
| `TWILIO_PHONE_NUMBER` | `+12255291680` |

### Trial 제한
- **Verified Caller ID**에 등록된 번호로만 SMS 수신 가능
- 고객 번호로 보내려면 **Twilio Upgrade** ($20)

### 한국 번호
- `010-1234-5678` → 자동으로 `+821012345678` 형식으로 발송

---

## 3. 확인

1. **설정** 페이지 → **이메일 · 문자 인증** 카드
2. `이메일 (Resend): 완료` / `문자 (Twilio): 완료` 확인
3. `/signup` → 이메일로 받기 → **실제 메일함** 확인

---

## 비용

| 서비스 | 무료 | 유료 |
|--------|------|------|
| Resend | 월 3,000통 무료 | 이후 소액 |
| Twilio SMS | Trial 크레딧 | 건당 과금 + Upgrade |

Effiroad는 자동 결제 없음. Resend/Twilio 계정에만 청구됩니다.
