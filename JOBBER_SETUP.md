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
   https://vowpath.vercel.app/api/jobber/callback
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

## 3. 테스트 Jobber 계정

Developer Center의 **Test in GraphiQL** 또는 본인 HVAC 테스트 Jobber 계정으로 OAuth 연결.

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
