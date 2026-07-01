# Jobber 연동 설정 (v2)

## 1. Jobber Developer Center

1. [developer.getjobber.com](https://developer.getjobber.com) 가입
2. **New App** 생성
3. **OAuth Callback URL** (로컬):

   ```
   http://localhost:3000/api/jobber/callback
   ```

   배포 후:

   ```
   https://effiroad.com/api/jobber/callback
   http://localhost:3000/api/jobber/callback
   ```

4. **Scopes** (최소):

   - Clients — read & write
   - Requests — read & write (또는 Jobs, 앱 설정에 맞게)

5. **Client ID** / **Client Secret** 복사

## 2. `.env.local`

```env
JOBBER_CLIENT_ID=your_client_id
JOBBER_CLIENT_SECRET=your_client_secret
JOBBER_REDIRECT_URI=http://localhost:3000/api/jobber/callback
JOBBER_GRAPHQL_VERSION=2025-04-16
```

## 3. 테스트 Jobber 계정 (Developer testing)

**가입 링크:** [getjobber.com/developer-sign-up](https://www.getjobber.com/developer-sign-up/)

- 90일 무료 테스트용 Jobber 샵 계정 (Core 기능, API 연동용)
- Developer Center 앱과 **별도** — 이걸로 OAuth “Allow Access” 테스트

### `예상치 못한 오류가 발생했습니다` (가입 실패)

대부분 **이미 Jobber에 등록된 이메일** (예: 예전 Trial) 이라 developer-sign-up 이 거절할 때 나옵니다.

**해결 (택1):**

1. **기존 계정 활용 (권장)** — `choigeunmin@naver.com` 으로 이미 Trial 했었다면:
   - [secure.getjobber.com/login](https://secure.getjobber.com/login) → 로그인 또는 **비밀번호 재설정**
   - 로그인 되면 아래 지원 메일로 **developer testing 으로 전환** 요청 (Trial 만료여도 OK)

2. **새 이메일로 가입** — Gmail / `@effiroad.com` 등 **한 번도 Jobber에 안 쓴** 주소로 developer-sign-up

3. **지원팀** — `api-support@getjobber.com`

```
Subject: Convert account to Developer Testing (90-day)

Hi,

I need a developer testing account for API integration (OAuth app in Developer Center).

Email: [your email]
App name: Effiroad
Issue: developer-sign-up shows "unexpected error" OR my trial expired and I need developer testing access.

Please convert my account to developer testing or enable API access for this email.

Thanks,
[Your name]
```

Developer Center의 **Test in GraphiQL** 만으로는 대시보드 **Jobber 연결** OAuth 는 대체 불가 — 위 테스트 샵 계정이 필요합니다.

## 4. 앱에서 확인

1. `npm run dev`
2. 로그인 → **대시보드**
3. **Jobber 연결** → Allow Access
4. Job Card 생성 → **Jobber로 보내기**

Jobber에 **Client** + **Request** 가 생성됩니다.

## 문제 해결

| 증상 | 해결 |
|------|------|
| 연결 버튼 비활성 | `JOBBER_CLIENT_ID` / `SECRET` 확인 |
| `invalid_state` | 쿠키 차단 해제, 같은 브라우저에서 재시도 |
| `redirect_uri` 오류 (isn't valid) | Jobber Developer Center → OAuth Callback URL에 **배포 URL** `/api/jobber/callback` 추가 |
| 배포 후 가입 안 됨 | Vercel Redis(KV) 연결 |
| developer-sign-up 빨간 오류 | 이메일 중복 → 로그인/재설정 또는 새 이메일 / `api-support@getjobber.com` |
| Trial 만료·Re-Authorize 불가 | Core 결제 말고 developer testing 전환 요청 |
| Collected revenue 안 나옴 | Developer Center에 **Invoices Read** scope 추가 후 Jobber **재연결** |
