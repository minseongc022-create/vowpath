# 하루온(dajeong) 배포 직전 Runbook

실제 운영자가 배포 전에 해야 하는 순서. 코드가 자동으로 처리할 수 있는 부분은 이미 다
되어 있고, 여기 남은 건 외부 계정/비밀키/배포 콘솔 접근이 필요한 단계뿐입니다.

## 1. Postgres 준비

이미 `DATABASE_URL`/`DIRECT_URL`로 다른 제품(Learn/Effiroad)이 쓰고 있는 것과 **같은
Postgres 인스턴스**를 그대로 씁니다. 새 DB를 만들 필요 없음 — 테이블명이 `dajeong_*`
접두사로 이미 격리되어 있습니다.

## 2. DAJEONG_DATABASE_URL 설정

```
DAJEONG_DATABASE_URL=<위 DATABASE_URL과 동일한 값>
```

이 값이 있어야 로그인 + 동반자/공유/알림 기능이 파일 저장소 대신 Postgres를 씁니다.
**배포 환경(Vercel 등)에 이 값이 없으면 해당 API들이 명확한 오류를 반환하도록 이미
구현되어 있습니다** — 조용히 파일 저장소로 대체되지 않습니다.

## 3. 테이블 생성

```bash
npx prisma generate
npx prisma db push
```

`prisma/dajeong-tables.sql`에 실제로 생성될 SQL 전문이 미리 정리되어 있으니 실행 전
검토할 수 있습니다. 이 저장소는 `prisma migrate`가 아니라 `db push`로 스키마를
동기화하는 기존 관행을 그대로 따릅니다(`package.json`의 `learn:push` 참고).

`db push` 실행 **직후**, 아래를 한 번 수동으로 실행하세요(partial unique index는
`db push`가 적용하지 못함 — `prisma/dajeong-tables.sql` 맨 아래 블록 참고):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "dajeong_notifications_active_dedupe_key"
  ON "dajeong_notifications" ("targetPersonId", "dedupeKey")
  WHERE "status" = 'scheduled';
```

## 4. Auth secret

```
DAJEONG_AUTH_SECRET=<openssl rand -base64 32 등으로 생성한 임의의 긴 문자열>
```

## 5. OAuth provider 등록

최소 하나 이상 필요(전부 선택):

- **Google**: https://console.cloud.google.com/apis/credentials → OAuth 클라이언트 생성
- **Kakao**: https://developers.kakao.com/console/app → 카카오 로그인 활성화
- **Naver**: https://developers.naver.com/apps → 애플리케이션 등록
- **Toss**: 공개 로그인 API가 없음 — 파트너 계약으로 실제 endpoint를 받은 경우만 해당

## 6. Callback URL 등록

각 provider 콘솔에 정확히 등록:

```
https://<실제 배포 도메인>/dajeong/api/auth/callback/google
https://<실제 배포 도메인>/dajeong/api/auth/callback/kakao
https://<실제 배포 도메인>/dajeong/api/auth/callback/naver
```

## 7. Google Places API 키

https://console.cloud.google.com/apis/credentials → "Places API (New)" 사용 설정,
결제 계정 연결 필요.

```
GOOGLE_MAPS_API_KEY=<키>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<같은 키>
```

없어도 앱은 동작하지만 OpenStreetMap fallback만 사용되어 평점·리뷰·영업시간 정보가
제한적입니다.

## 8. VAPID 키 생성 (Web Push)

```bash
npx web-push generate-vapid-keys
```

출력된 값을 그대로:

```
VAPID_PUBLIC_KEY=<Public Key>
VAPID_PRIVATE_KEY=<Private Key>
VAPID_SUBJECT=mailto:<운영자 이메일>
```

없어도 알림 계산/저장/설정 화면은 정상 동작하지만 실제 기기로는 발송되지 않습니다.

## 9. Cron 등록 (cron-job.org)

`config/cron.schedule.json`의 `externalCrons`에 이미 등록 항목이 들어가 있습니다
(이 저장소의 다른 크론들과 같은 방식). **직접 만들 필요 없이 기존 자동 등록
스크립트를 한 번 실행하면 됩니다**:

```bash
export CRONJOB_ORG_API_KEY=<cron-job.org 계정 → Settings → API key>
export CRON_SECRET=<Vercel에 설정한 값과 동일>
export NEXT_PUBLIC_APP_URL=https://<배포 도메인>
node scripts/cron-job-org-setup.mjs
```

`CRONJOB_ORG_API_KEY`/`CRON_SECRET` 둘 다 없으면 스크립트는 조용히 아무것도 하지
않고 스킵합니다(실제로 이 저장소 개발 세션에서 그렇게 확인했습니다 — 그 세션엔
cron-job.org 계정 접근 권한이 없었습니다). 값을 채운 뒤 실행하면:

```
✓ created job <jobId> → https://<도메인>/api/cron/dajeong-notifications
```

가 출력되며 60초 간격 job이 실제로 생성됩니다(같은 URL의 job이 이미 있으면 갱신).
수동으로 대시보드에서 만들고 싶다면 아래 값을 그대로 입력해도 됩니다:

| 항목 | 값 |
|------|-----|
| URL | `https://<배포 도메인>/api/cron/dajeong-notifications` |
| Method | GET |
| Interval | 60초 |
| Header | `Authorization: Bearer <CRON_SECRET>` |
| Timeout | 15~30초 권장 |
| 예상 응답 | `200 {"ok": true, "plansScanned": N, "dispatched": N, ...}` |

`vercel.json`에 이미 일 1회 백업 크론(`0 17 * * *`)이 등록되어 있어, 위 등록을
깜빡해도 하루 한 번은 정리됩니다(단, 실시간성은 크게 떨어짐). `npm run check:cron`으로
이 항목이 제대로 추적되고 있는지 확인할 수 있습니다.

## 10. Production 도메인 반영

`vercel.json`의 `NEXT_PUBLIC_APP_URL`이 실제 배포 도메인과 일치하는지 확인.

## 11. 배포

일반적인 Vercel 배포 절차. 이 저장소의 `postinstall`이 `prisma generate`를 자동
실행합니다.

## 12. OAuth smoke

배포된 도메인에서 각 로그인 버튼 클릭 → 실제 provider 화면으로 이동 → 로그인 →
`/dajeong`로 리디렉션되며 로그인 상태 표시되는지 확인.

## 13. Places smoke

`/dajeong`에서 실제 데이트 계획 요청 → 장소 카드에 실제 평점/주소/사진이 뜨는지 확인
(뜨지 않으면 7번 키 확인).

## 14. Push smoke

실제 폰에서:

1. 배포 주소 접속 → 로그인
2. 계획 1개 생성
3. "알려줘" 알림 권한 프롬프트 허용
4. `/dajeong/notifications`에서 알림이 "켜짐" 상태인지 확인
5. (선택) 서버에서 `/api/cron/dajeong-notifications`를 수동 호출해 due 알림이 있으면
   실제 기기에 push가 오는지 확인 — 당장 due한 알림이 없으면 아무 일도 안 일어나는 게
   정상입니다(가짜로 하나 만들어 테스트하려면 계획의 항목 시간을 곧 다가올 시간으로
   임시로 바꿔보세요).

## 15. 2-user secret smoke

두 계정(또는 계정 1개 + 익명 브라우저 1개)으로:

1. A가 계획 생성 → B 초대 → 공유
2. A가 항목 하나를 비밀로 전환
3. B가 공유 계획을 열어 시크릿 항목이 안 보이는지 확인
4. A가 꽃/케이크 준비를 추가하고 비밀로 전환
5. B의 알림 목록에 해당 준비물 관련 알림이 전혀 없는지 확인

---

이 문서에 없는 나머지(코드 수정, DB 스키마, API, 테스트, 문서)는 이미 이번 작업에서
전부 완료되어 커밋되어 있습니다.
