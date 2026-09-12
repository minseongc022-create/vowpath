# VibeSafe — AI로 만든 앱, 고객보다 먼저 확인한다

Cursor·Claude Code·Codex·Lovable로 앱을 만든 비개발자·1인 개발자가 GitHub 저장소와
배포 주소를 연결하면, 핵심 기능이 실제로 동작하는지 브라우저로 계속 확인하고
**정상이던 기능이 깨진 순간**을 알려준다.

경로: `effiroad.com/vibesafe` (전용 도메인을 붙이면 그 도메인의 `/`)

---

## 1. 지금 되는 것 / 안 되는 것

| | 상태 |
|---|---|
| 이메일 가입·로그인·로그아웃 | ✅ |
| GitHub 연결 (App 설치 또는 읽기 전용 토큰) | ✅ |
| 프로젝트 등록 (저장소 + 배포 주소) | ✅ |
| AI가 저장소를 읽고 핵심 흐름 추론 | ✅ |
| 사용자가 흐름 확인·수정·켜고 끄기 | ✅ |
| 실제 브라우저(Playwright)로 흐름 실행 | ✅ |
| 실패 지점·오류·스크린샷 기록 | ✅ |
| baseline 대비 회귀 판정 | ✅ |
| 앱 내 알림 + 이메일 알림 (중복 억제 포함) | ✅ |
| push webhook / 정기 검사 | ✅ |
| 기본 보안 점검(명백한 키 노출 등) | ✅ |
| 사용량 측정 + 한도 | ✅ |
| 자동 원인 분석·자동 수정·자동 롤백 | ❌ 이번 버전에 없음 |
| 결제 시스템 | ❌ 무료 베타 |

> 랜딩 페이지에도 같은 기준으로 적혀 있다. 아직 없는 기능을 있는 것처럼 쓰지 않는다.

---

## 2. 아키텍처 한 장

```
브라우저 (Next.js)
   │  가입/연결/흐름 확인/결과 보기
   ▼
Next.js 서버 (Vercel)  ──▶  PostgreSQL (Supabase)
   │                          vibesafe_* 테이블
   │
   ├─ AI 공급자 (Anthropic 또는 OpenAI)  … 저장소 분석. 지문이 같으면 호출하지 않음
   ├─ GitHub API                          … 저장소 읽기 전용
   └─ 검사 큐 (vibesafe_test_runs)
              ▲ claim / complete (HTTPS + 워커 토큰)
              │
       브라우저 워커 (별도 프로세스)
       scripts/vibesafe-runner.mjs + Playwright
```

### 왜 워커가 따로 있나

Playwright는 Chromium 바이너리(~150MB)와 수십 초의 실행 시간이 필요하다. 서버리스
함수의 크기·시간 제한과 정면으로 부딪힌다. 억지로 넣으면 **검사 서비스가 검사에
실패한 걸 모르는** 상태가 되므로, 워커는 평범한 Node 프로세스로 뺐다. 노트북,
작은 VPS, 도커 어디서든 같은 명령으로 돈다.

**워커가 한 대도 안 돌고 있으면 검사는 `queued`에 머문다.** 화면에도 "확인 중"으로
보인다. 배포 전에 워커를 먼저 띄울 것.

---

## 3. 설치

### 3-0. 가장 빠른 길 (권장)

```bash
npm run vibesafe:infra      # 비밀값 생성 + (VERCEL_TOKEN 있으면) Vercel 반영
```

GitHub Actions에서 돌려도 된다 — **Actions → "VibeSafe 운영 준비" → Run workflow**
(저장소에 이미 있는 `VERCEL_TOKEN` 시크릿을 쓴다).

이 스크립트가 만들어 주는 것: `VIBESAFE_AUTH_SECRET`, `VIBESAFE_ENCRYPTION_KEY`,
`VIBESAFE_RUNNER_TOKEN`.
사람이 넣어야 하는 것: `VIBESAFE_DATABASE_URL`, AI 키(`ANTHROPIC_API_KEY` 또는
`OPENAI_API_KEY`), 선택으로 `RESEND_API_KEY`. 무엇이 빠졌는지 스크립트가 알려준다.

> ★ **이미 있는 값은 덮어쓰지 않는다.** 특히 `VIBESAFE_ENCRYPTION_KEY`를 바꾸면
> 저장된 GitHub 연결과 테스트 계정을 **전부 복호화할 수 없게 된다**. 교체가
> 필요하면 `--rotate=KEY_NAME`으로 이름을 정확히 대야 한다.

설정이 끝났는지 확인: **`https://<도메인>/vibesafe/setup`**
무엇이 됐고 무엇이 남았는지 한국어로 보여준다(비밀값은 표시하지 않는다).

### 3-1. 데이터베이스

```bash
# Supabase나 아무 PostgreSQL이나 된다. 기존 DATABASE_URL을 그대로 쓴다.
npm run vibesafe:push      # prisma db push — vibesafe_* 테이블 19개 생성
```

### 3-2. 필수 환경변수

```bash
VIBESAFE_DATABASE_URL="$DATABASE_URL"                  # 사용 플래그
VIBESAFE_AUTH_SECRET="$(openssl rand -base64 32)"      # 세션 서명
VIBESAFE_ENCRYPTION_KEY="$(openssl rand -base64 32)"   # 토큰·계정 암호화 (정확히 32바이트)
VIBESAFE_RUNNER_TOKEN="$(openssl rand -base64 32)"     # 워커 인증
ANTHROPIC_API_KEY=...          # 또는 OPENAI_API_KEY
```

전체 목록과 설명은 `.env.example`의 VibeSafe 구역에 있다.

### 3-3. GitHub 연결 — 둘 중 하나

**(A) GitHub App — 권장.** 사용자가 클릭 한 번으로 연결하고, 우리는 장기 토큰을
저장하지 않는다.

1. https://github.com/settings/apps/new
2. **Repository permissions**: `Contents: Read-only`, `Metadata: Read-only` — 이 둘만.
3. **Subscribe to events**: `Push` 만.
4. Webhook URL: `https://<도메인>/api/vibesafe/webhooks/github`, Secret은 직접 생성.
5. Callback URL: `https://<도메인>/api/vibesafe/github/callback`
6. 발급받은 값을 환경변수로:
   ```
   VIBESAFE_GITHUB_APP_ID=123456
   VIBESAFE_GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   NEXT_PUBLIC_VIBESAFE_GITHUB_APP_SLUG=your-app-slug
   VIBESAFE_GITHUB_WEBHOOK_SECRET=위에서 만든 값
   ```

**(B) 아무것도 설정하지 않기.** 그러면 사용자는 fine-grained PAT를 직접 만들어
붙여넣는다(`Contents: Read-only` + `Metadata: Read-only`). 토큰은 암호화해 저장한다.
App 설정 없이도 제품은 완전히 동작한다 — push 자동 검사만 저장소별 webhook을
직접 추가해야 한다(설정 화면에서 안내한다).

### 3-4. 브라우저 워커 띄우기 — 셋 중 하나

**(A) GitHub Actions — 서버가 필요 없다. 권장.**

저장소 Secrets에 `VIBESAFE_RUNNER_TOKEN`(3-0에서 출력된 값)을 넣으면 끝이다.
`.github/workflows/vibesafe-runner.yml`이 15분마다 큐를 비운다.

- Variables에 `VIBESAFE_API_URL`을 넣으면 배포 주소를 바꿀 수 있다(기본 effiroad.com).
- 즉시 돌리려면 Actions → "VibeSafe 브라우저 워커" → Run workflow.
- 시크릿이 없으면 워크플로는 **조용히 건너뛴다** — 설정 전에 실패 메일이
  15분마다 오는 것만큼 알림을 빨리 끄게 만드는 것도 없다.

**(B) 아무 서버에서나 프로세스로**

```bash
npx playwright install chromium     # 최초 1회

VIBESAFE_API_URL=https://your-app.com \
VIBESAFE_RUNNER_TOKEN=위와_같은_값 \
npm run vibesafe:runner
```

**(C) 도커 — 항상 켜두고 싶을 때**

```bash
docker build -f Dockerfile.vibesafe-runner -t vibesafe-runner .
docker run -d --restart=always \
  -e VIBESAFE_API_URL=https://your-app.com \
  -e VIBESAFE_RUNNER_TOKEN=... \
  vibesafe-runner
```

공통 옵션:
- `npm run vibesafe:runner:once` — 한 번만 처리하고 종료(cron/CI용).
- `VIBESAFE_BROWSER_PATH=/path/to/chrome` — 이미 설치된 Chromium을 쓴다.

프로세스가 죽어도 안전하다. 붙잡힌 검사는 10분 뒤 크론이 되살리고, 3회 시도 후에는
실패로 끝낸다(무한 재시도 없음).

### 3-5. 정기 검사

`vercel.json`에 하루 1회 등록되어 있다(Hobby 요금제 한도). 더 자주 돌리려면
`config/cron.schedule.json`의 `externalCrons` 항목대로 cron-job.org에 등록한다.
자세한 내용은 `CRON.md`.

---

## 4. 안전 설계 — 반드시 읽을 것

이 서비스는 **남의 운영 중인 앱**에 브라우저를 붙여 실제로 클릭한다.

### 4-1. 절대 실행하지 않는 행동

`vibesafe/lib/flows/safety.ts`가 흐름의 위험도를 매기고, **AI가 매긴 값은 참고만
하고 항상 이 규칙이 덮어쓴다.**

| 등급 | 예 | 동작 |
|---|---|---|
| `safe` | 열기·읽기·검색·로그인 | 바로 실행 |
| `caution` | 글 작성·수정 | 사용자가 직접 켜야 실행 |
| `blocked` | 결제·문자/이메일 발송·주문 확정·삭제·환불·송금 | **어떤 경우에도 실행하지 않음** |

`blocked`는 UI에서 켤 수 없고, API를 직접 호출해도 거절된다(화면만 막으면 API로
뚫린다). 결제 화면은 "버튼이 보이는 것까지" 확인하고 누르지 않는다.

### 4-2. 비밀 값

- GitHub 토큰·테스트 계정: AES-256-GCM으로 암호화해 저장. 평문 컬럼이 없다.
- GitHub App으로 연결하면 장기 토큰을 **아예 저장하지 않는다**(설치 id만 저장하고
  1시간짜리 설치 토큰을 매번 받는다).
- 워커 오류 메시지에서 입력값을 지운다 — Playwright는 `fill`에 넣은 값을 오류에
  그대로 싣는다.
- 보안 점검 결과에는 **발견한 값 자체를 저장하지 않는다**(마스킹된 흔적만).

### 4-3. 요청 검증

- 등록 주소는 SSRF 검사를 거친다. 사설 IP·localhost는 거절하고, 클라우드 메타데이터
  주소(`169.254.169.254`, `metadata.google.internal`)는 개발 플래그가 켜져 있어도 막는다.
  - ⚠️ **남은 위험**: 공개 DNS 이름이 사설 IP로 해석되는 경우(DNS rebinding)는
    막지 못한다. 워커를 내부망 접근이 없는 곳에서 돌리는 것으로 방어할 것.
- GitHub webhook은 HMAC 서명을 검증한 **뒤에만** 행동한다. 서명 없이는 아무 일도
  일어나지 않는다.
- 모든 프로젝트 조회는 `userId`와 함께 한다(`vibesafe/lib/projects.ts`).
- 가입·로그인·분석·검사 실행에 속도 제한이 걸려 있다.

### 4-4. 하지 않는 일

사용자의 저장소에 커밋·푸시·배포·설정 변경을 하지 않는다. 읽기만 한다.

---

## 5. 비용 통제

| 항목 | 방식 |
|---|---|
| AI 분석 | 선별한 파일의 blob sha로 **지문**을 만들어, 같으면 호출하지 않는다. README 오타로 커밋 sha가 바뀌어도 재분석하지 않는다. |
| 프롬프트 크기 | 저장소 전체가 아니라 파일 40개·15만자 상한으로 선별한다(`analysis/collect.ts`). |
| 브라우저 시간 | 단계 15초, 흐름 90초 상한. 사용자별 월 실행 시간 한도. |
| 검사 중복 | 프로젝트당 동시 1건 + `dedupeKey` 유니크 제약. |
| 모델 | `VIBESAFE_ANTHROPIC_MODEL` / `VIBESAFE_OPENAI_MODEL`로 교체 가능. |
| 엔드포인트 | `VIBESAFE_OPENAI_BASE_URL`로 Azure OpenAI·LiteLLM·OpenRouter·사내 게이트웨이·로컬 모델(Ollama 호환)에 붙일 수 있다. |

---

## 6. 데이터 모델

`prisma/schema.prisma`의 VibeSafe 구역. 19개 테이블 전부 `vibesafe_` 접두사.

핵심만:
- `VibesafeCriticalFlow.key` — baseline 비교의 축. 재분석해도 같은 흐름이면 같은 key.
- `VibesafeTestRun.dedupeKey` — 유니크. 중복 webhook·연타를 DB가 막는다.
- `VibesafeFlowBaseline` — "이 흐름은 이때 분명히 됐다". 회귀 판정의 기준.
- `VibesafeIncident` — 장애 1건 = 행 1개. 같은 장애가 이어지는 동안 늘지 않는다.
- `VibesafeNotification` — `(dedupeKey, channel)` 유니크로 알림 폭탄을 막는다.

---

## 7. 개발

```bash
npm run vibesafe:push          # 스키마 반영
npm run dev                    # http://localhost:3000/vibesafe
npm run test:vibesafe          # 단위 테스트 (안전 규칙·SSRF·암호화·서명 검증)
npm run vibesafe:runner:once   # 큐에 있는 검사 하나 처리
```

자기 앱을 localhost로 검사하려면 `VIBESAFE_ALLOW_LOCAL_TARGETS=1` (개발 전용).

---

## 8. 제품 분석 이벤트

`vibesafe_analytics_events`에 쌓인다. 답하려는 질문:

1. 가입한 사람 중 몇 %가 앱을 연결하는가 — `signup_completed` → `github_connected`
2. 몇 %가 첫 검사를 끝내는가 — `first_test_started` → `first_test_passed`/`failed`
3. 문제가 얼마나 자주 발견되는가 — `incident_detected` ÷ 검사 횟수
4. 반복해서 돌아오는가 — `return_visit`
5. 어떤 기능이 가장 많이 깨지는가 — `incident_detected.props.flowKey`

이벤트 이름을 바꾸면 과거 데이터가 끊긴다. 새 이름을 추가할 것.

```sql
-- 연결 전환율
SELECT
  count(*) FILTER (WHERE name = 'signup_completed')  AS 가입,
  count(*) FILTER (WHERE name = 'github_connected')  AS 연결,
  count(*) FILTER (WHERE name = 'first_test_passed') AS 첫검사성공
FROM vibesafe_analytics_events;

-- 가장 많이 깨지는 기능
SELECT props->>'flowKey' AS 기능, count(*)
FROM vibesafe_analytics_events
WHERE name = 'incident_detected'
GROUP BY 1 ORDER BY 2 DESC;
```
