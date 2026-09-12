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
| 실패 원인 자동 분석 (커밋 범위 추적) | ✅ 권한 필요 |
| 수정안 PR 자동 생성 | ✅ 권한 + 쓰기 연결 필요 |
| 배포 자동 되돌리기 | ✅ 권한 + Vercel 연결 필요 |
| 외부 공격 표면 점검 (.env 노출, 브라우저에 박힌 키 등) | ✅ |
| 안정성 이력 (무사고 일수·90일 히트맵) | ✅ |
| README 배지 + 공개 상태 페이지 | ✅ |
| PR 프리뷰 검사 (머지 전에 차단) | ✅ |
| 교차 고객 이상탐지 ("우리만 그런가요?") | ✅ |
| 앱 사용자 역할 추론 + 역할별 앱 지도 | ✅ |
| 간편 / 전문가 모드 (한 제품, 두 화면) | ✅ |
| 수정 위험도 분류 (LOW/MEDIUM/HIGH) | ✅ |
| 수정안 프리뷰 검증 (깨진 흐름 + 회귀 흐름 재실행) | ✅ 권한 필요 |
| [수정 적용하기] — 검증 통과한 PR 머지 | ✅ 권한 + 쓰기 연결 필요 |
| 적용 후 **실서비스 재검증** → "고쳤습니다" | ✅ |
| LOW 위험 자동 적용 (옵트인, 기본 꺼짐) | ✅ |
| 프리뷰 파이프라인 재조정 (웹훅 없이도 멈추지 않음) | ✅ |
| 미리보기 주소 직접 입력 (Vercel 아닌 곳도 검증 가능) | ✅ |
| 수정 이력 + 프로젝트별 성공률 화면 | ✅ |
| 신뢰도 엔진 (다음 권한 단계 제안, 절대 자동 전환 아님) | ✅ |
| **코드를 기본 브랜치에 직접 push** | ❌ **의도적으로 만들지 않음** |
| **MEDIUM/HIGH 위험 수정의 자동 적용** | ❌ **의도적으로 만들지 않음** |
| 결제 시스템 | ❌ 무료 베타 |

> 랜딩 페이지에도 같은 기준으로 적혀 있다. 아직 없는 기능을 있는 것처럼 쓰지 않는다.

## 1-1. 권한 사다리 — "고쳐준다"의 정확한 범위

VibeSafe는 **켠 것만** 합니다. 기본값은 전부 꺼짐입니다.

| 단계 | 하는 일 | 필요한 것 | 되돌릴 수 있나 |
|---|---|---|---|
| 감시 (항상) | 저장소 읽기 + 브라우저 검사 + 알림 | 없음 | — |
| 원인 분석 | 마지막 정상 시점 이후 커밋을 읽어 범인 좁히기 | 권한 켜기 | 아무것도 안 바꿈 |
| 수정안 PR | 새 브랜치에 고친 코드 올리고 PR 열기 | 권한 + 쓰기 연결 | 머지 안 하면 끝 |
| 확인한 수정 적용하기 | **사람이 누른 그 PR 하나**를 머지 | 권한 + 쓰기 연결 | revert 가능 (squash 1커밋) |
| 배포 되돌리기 | 직전 정상 배포로 되돌리기 | 권한 + Vercel 연결 | 다시 앞으로 갈 수 있음 |

그 위에 설정 하나가 더 있습니다.

| 설정 | 하는 일 | 기본값 |
|---|---|---|
| LOW 위험 자동 적용 | LOW로 분류 + 검증 통과한 수정을 버튼 없이 적용 | **꺼짐** |

**의도적으로 없는 단계: 코드를 기본 브랜치에 직접 push.**
되돌릴 수 없는 행동을 AI 판단만으로 실행하지 않는다는 원칙이 이 제품 전체를
관통합니다(결제·발송·삭제를 막는 `flows/safety.ts`와 같은 규칙입니다).

'확인한 수정 적용하기'가 생긴 뒤에도 그대로입니다. 머지는
(1) 프리뷰 검증을 통과한 제안에 대해서만, (2) 사람이 그 제안을 보고 버튼을
눌렀을 때만, (3) 한 번에 한 건만 일어납니다. AI가 "이게 맞는 것 같으니
올려야지" 하고 기본 브랜치를 건드리는 경로는 코드에 존재하지 않습니다.

예외처럼 보이는 자동 적용도 마찬가지입니다. 사람이 미리 "LOW 위험은 묻지 말고
적용해줘"를 켠 경우에만 동작하고, LOW 판정은 AI가 아니라 `repair/risk.ts`의
규칙이 내립니다. 로그인·결제·권한·미들웨어를 건드리거나, 파일이 2개를 넘거나,
원인 확신도가 낮거나, 같은 문제의 두 번째 시도이면 **무조건 HIGH**이고
자동 적용 경로가 아예 없습니다.

권한으로 한 모든 행동은 `vibesafe_action_logs`에 남고 화면에서 볼 수 있습니다.
기록이 없는 권한은 아무도 안 줍니다.

---

## 1-2. 파이프라인 — 감지에서 "고쳤습니다"까지

```
UNDERSTAND → USER → MAP → VERIFY → WATCH → DETECT → DIAGNOSE
                                               ↓
                    WATCH ← APPLY ← VERIFY AGAIN ← REPAIR
```

| 단계 | 하는 일 | 서비스가 바뀌나 |
|---|---|---|
| UNDERSTAND | 저장소를 읽고 "이 앱은 무엇인가" 파악 | 아니오 |
| USER | 이 앱을 쓰는 사람의 역할 정리 (손님/사장님) | 아니오 |
| MAP | 흐름을 역할에 연결 → 앱 지도 | 아니오 |
| VERIFY | 실제 브라우저로 흐름 실행 | 아니오 |
| WATCH | push·배포·정기 검사 | 아니오 |
| DETECT | baseline 대비 회귀 판정 → 장애 생성 | 아니오 |
| DIAGNOSE | 마지막 정상 커밋 이후를 읽어 원인 좁히기 | 아니오 |
| REPAIR | 수정 패치 생성 → 새 브랜치 → PR + 위험도 분류 | 아니오 |
| VERIFY AGAIN | **프리뷰 배포**에서 깨진 흐름 + 회귀 흐름 재실행 | 아니오 |
| APPLY | 사람이 [수정 적용하기] → PR 머지 | **예** |
| WATCH | 배포 후 **실서비스** 재검증 → `verified` | 아니오 |

### ★ `applied`는 "고쳤습니다"가 아니다

`applied`는 코드가 합쳐진 것이고, `verified`는 **머지된 코드가 실제 주소에서
다시 되는 걸 확인한 것**입니다. 그 사이에는 배포가 늦거나, 실패하거나, 고친 줄
알았는데 아닌 경우가 있습니다.

"고쳤습니다"라고 말할 수 있는 상태는 `verified` 하나뿐입니다. 이 구분이
흐려지면 사용자는 고쳐졌다고 믿고 자고, 아침에 여전히 깨진 앱을 봅니다.
`tests/unit/vibesafe/repair-pipeline.test.mjs`가 이 문장을 고정합니다.

### VERIFY AGAIN이 확인하는 것 / 하지 않는 것

| 확인한다 | 어떻게 |
|---|---|
| 깨졌던 흐름이 이제 되는가 | 프리뷰 배포에서 그 흐름 재실행 |
| 나머지 흐름이 여전히 되는가 | 운영에서 성공한 적 있는(baseline 있는) 흐름만 비교 |
| 저장소 CI가 통과했는가 | 사용자 저장소의 check-run 결과를 **읽는다** |

빌드는 우리가 돌리지 않습니다. 사용자의 비밀과 환경을 우리 쪽에 재현해야
하는데, 가능해도 하고 싶지 않은 일입니다. CI가 아예 없는 저장소라면
"빌드 통과"라고 말하지 않고 **"확인할 수 없었다"**고 적습니다.

## 1-2-1. 웹훅 없이도 멈추지 않는다 (`repair/reconcile.ts`)

VERIFY AGAIN과 그 다음의 실서비스 재확인은 원래 외부 신호(Vercel의
`deployment_status` webhook, 워커의 검사 완료 보고)를 기다린다. 그 신호가
아예 안 오면 — 워커가 죽었거나, Vercel이 아니거나, webhook 연결이 빠졌거나 —
제안은 `opened`나 `applied`에 영원히 멈춘다. cron이 매 주기 이걸 스스로
재조정한다.

| 멈춘 곳 | 언제 감지 | 어떻게 되살리나 |
|---|---|---|
| `opened` (미리보기 신호 없음) | 2시간 | `needs_human`으로 전환 + 미리보기 주소 직접 입력 안내 |
| `verifying` (워커가 죽음) | 최대 재시도 소진 | 결과 없이 정직하게 `needs_human` — 성공으로 둔갑시키지 않음 |
| `applied` (운영 재확인 신호 없음) | 10분마다 재시도 | 등록된 운영 주소로 직접 재검사(웹훅과 무관) |
| `applied` (6시간째 재확인 실패) | 6시간 | 포기하지 않고 `needs_human`으로 넘겨 사람에게 알림 |

Vercel이 아닌 곳에 배포했거나 webhook이 늦다면, 장애 화면에서 미리보기 주소를
직접 입력해 바로 검증을 시작할 수 있다(`POST /api/vibesafe/projects/:id/repair-verify`).
등록 주소와 같은 SSRF 검사를 거친다.

## 1-2-2. 신뢰도 엔진 (`trust.ts` + `trust-ladder.ts`)

장애 판정 정확도, 수정 성공률, **LOW 위험 수정만의** 성공률을 합쳐 다음
권한 단계를 화면에서 **제안**한다. 판단 로직은 순수 함수(`evaluateTrustLadder`)로
떼어 `tests/unit/vibesafe/trust-ladder.test.mjs`가 규칙을 고정한다.

- 표본이 5건 미만이면 그 신호는 보여주지 않는다(근거 없이 말하지 않는다).
- 사다리는 한 칸씩만 오른다 — 이미 켠 단계를 다시 권하거나 두 단계를
  건너뛰지 않는다.
- LOW 위험 자동 적용은 전체 성공률이 아니라 **LOW로 분류된 사례만** 따로
  본다 — 위험도가 낮다고 규칙이 판단한 것들이 실제로도 안전했는지는
  따로 검증되어야 하는 질문이기 때문이다.
- **이 파일은 어떤 권한도 켜지 않는다.** `setPermission`을 부르지 않는다.
  제안 카드는 항상 "회원님의 결정이고, VibeSafe가 스스로 켜는 일은 없습니다"를
  같이 보여준다.

## 1-2-3. 수정 이력 (`/vibesafe/projects/:id/repairs`)

프로젝트가 시도한 수정 전부를 나열한다. **성공한 것만 골라 보여주지 않는다** —
미리보기에서 걸러진 것, 적용 후에도 안 된 것까지 그대로 나온다. 표본이
5건 미만이면 성공률 숫자 대신 건수만 보여준다.

## 1-3. 간편 모드 / 전문가 모드

같은 제품, 같은 검사, 같은 수정. **다른 것은 말뿐입니다.**

| | 간편 | 전문가 |
|---|---|---|
| 장애 | "손님이 '예약 결제'를 하지 못합니다" | "checkout 4단계 실패 · TimeoutError · 3f2a91c" |
| 수정 | "미리 확인해봤더니 다시 할 수 있습니다" | "검증 통과 · 적용 대기 · PR #42" |
| 버튼 | [수정 적용하기] | [이 PR 머지하기] |

간편 모드에서 **정보를 지우지 않습니다.** 커밋 해시도, PR 번호도, diff도,
스택 트레이스도 다 있고 [기술 상세 보기] 안에 접혀 있을 뿐입니다. 보호한다는
이유로 사실을 감추면 그건 보호가 아니라 통제입니다.

온보딩에서 "당신은 개발자입니까?"라고 묻지 않습니다. 자존심이 걸린 질문이라
정직한 답이 안 나옵니다. 대신 원하는 결과를 묻습니다 — 어느 쪽을 골라도
부끄럽지 않게. 기본값은 간편이고, 계정 화면에서 언제든 바꿉니다.

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

## 2-1. 경쟁사가 따라하기 어려운 지점

제품을 팔 때 이 다섯 가지를 전면에 둔다. 전부 구현되어 있다.

**1. 시간이 쌓일수록 커지는 이력** (`lib/history.ts`)
경쟁사가 내일 같은 제품을 내놔도 *이 사용자의 앱에 대한* 과거 기록은 0에서
시작한다. "로그인이 87일째 무사고"는 87일을 실제로 지켜본 도구만 말할 수 있다.
갈아타면 그 숫자가 0이 된다. 화면 첫 줄에 크게 띄운다.

**2. 바이브코딩 특화 실패 패턴** (`lib/analysis/security-scan.ts`, `lib/security/probe.ts`)
범용 모니터링 도구는 스택을 모른다. 우리는 Next.js+Supabase+Vercel 하나만 판다.
그리고 **Lovable·Cursor 같은 생성 도구는 이걸 만들 유인이 구조적으로 약하다** —
자기 생성 코드의 실패율을 스스로 드러내는 도구를 자기가 만들 이유가 없다.

**3. README 배지 + 공개 상태 페이지** (`lib/public-status.ts`)
고객 저장소마다 배지가 박혀 역유입되는 확산 고리. 광고비 0원.
동시에 고객에게도 "우리 서비스 잘 돕니다"를 증명하는 수단이라 억지 홍보가 아니다.

**4. 신뢰로 얻는 권한** (`lib/permissions.ts`)
처음 보는 도구에게 아무도 PR 권한을 주지 않는다. 오탐 없이 쌓인 기록이
다음 단계를 연다. 이건 돈으로도 못 사는 전환비용이다.

**5. 교차 고객 이상탐지** (`lib/signals.ts`)
"로그인이 깨졌습니다"와 "같은 시각 다른 앱 12개도 같은 증상입니다 — Supabase
쪽 문제로 보입니다"는 완전히 다른 말이다. 고객이 1명인 경쟁사는 이 문장을
영원히 만들 수 없다. 집계에는 프로젝트 식별자를 남기지 않는다.

**추가 — 머지 전에 차단** (`lib/runs/pr-check.ts`)
Vercel 프리뷰 배포에 흐름을 돌려 PR에 결과를 댓글로 단다. 나머지 기능이
"이미 깨진 뒤 빨리 알려주는" 것이라면 이건 **고객이 깨진 앱을 볼 일 자체를
없앤다**. PR 워크플로에 한번 들어가면 빼기 어려운 자리이기도 하다.

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

### 4-4. 자동 수정이 건드리지 않는 파일

권한을 켜도 아래는 자동 수정 대상이 아니다 (`repair/propose-fix.ts`):

- `.github/` — 워크플로를 고치면 CI 자체를 우회할 수 있다
- `.env*` — 비밀
- `package.json`, 잠금 파일 — 의존성 변경은 사람이
- `prisma/migrations/` — 되돌리기 어렵다
- `next.config.*`, `vercel.json` — 배포 설정

변경량도 검사한다. 원본의 30%를 넘게 바꾸거나 줄 수가 절반 이하로 줄면 거절한다 —
"버튼 텍스트 한 줄"을 부탁했는데 파일이 통째로 리팩터링되어 오는 일이 실제로 있다.

### 4-5. 보안 점검의 한계 (중요)

**이건 방화벽도 침입 탐지도 아니다.** VibeSafe는 사용자 앱의 요청 경로에 끼어
있지 않아서 실시간으로 공격을 막을 수 없다. 할 수 있는 건 다른 것이다 —
**공격자가 제일 먼저 확인하는 것을 공격자보다 먼저 확인한다.**

확인하는 것: 인터넷에 열린 `.env`/`.git`/백업 파일, 브라우저 번들에 박힌
service_role·API 키, 로그인 없이 열리는 관리자 경로, 빠진 보안 헤더,
디렉터리 목록 노출.

모든 점검은 **GET만** 쓴다. 데이터를 만들거나 지우거나 바꾸지 않고, 무차별
대입이나 퍼징도 하지 않는다. 발견한 값은 마스킹해서만 저장한다.

### 4-4-1. 수정 위험도 — 무엇을 물어보지 않고 적용해도 되는가

`repair/risk.ts`가 규칙으로 정한다. **AI에게 묻지 않는다** — "이 수정 위험해?"에
AI는 대체로 "안전합니다"라고 답한다. 자기가 방금 쓴 코드니까.

판정은 **한 방향으로만** 움직인다. 어떤 신호든 위험을 올릴 수는 있어도 내릴 수는
없다. 안전해 보이는 이유 열 개가 위험해 보이는 이유 하나를 이기지 못하게 하려는
것이다.

| 등급 | 조건 | 자동 적용 |
|---|---|---|
| `low` | 파일 1개 + 10줄 이하 + (확신도 80%↑ 또는 CSS/문구 파일) | 옵트인 시 가능 |
| `medium` | 기본값 | 사람이 눌러야 함 |
| `high` | 아래 중 **하나라도** 해당 | **경로 자체가 없음** |

HIGH가 되는 조건:
- 경로에 auth·login·session·payment·checkout·billing·permission·admin·middleware·
  webhook·crypto·prisma·`/api/`가 들어감
- 파일 3개 이상, 또는 바뀌는 줄 40줄 초과
- 원인 확신도 60% 미만
- 결제·발송·삭제가 걸린 흐름(`blocked`/`caution`)과 관련
- 같은 문제에 대한 2번째 이상의 시도

### 4-4-2. 적용(APPLY)이 통과해야 하는 다섯 관문

`repair/apply.ts`가 사용자 운영 서비스를 바꾸는 **유일한** 코드 경로다.

1. `applyFix` 권한이 켜져 있음 (사용자가 미리 허락)
2. 상태가 `ready_to_apply` (프리뷰 검증을 통과했다는 뜻)
3. PR의 head sha가 검증할 때와 동일 — 확인한 것과 합쳐지는 것이 같음
4. 기본 브랜치에 직접 쓰지 않음 — PR을 머지할 뿐 (squash 1커밋 → revert 쉬움)
5. 시간당 3건 속도 제한

3번이 특히 중요하다. 사용자가 diff를 보고 [적용]을 누르는 사이에 그 브랜치에 다른
커밋이 올라왔다면, 사용자가 승인한 것과 다른 코드가 운영에 나간다. 우리가 만든
브랜치라 드문 일이지만, 드문 일이 일어났을 때 조용히 넘어가는 것보다 실패하는
편이 낫다.

### 4-6. 하지 않는 일

권한을 켜지 않으면 사용자의 저장소에 커밋·푸시·배포·설정 변경을 하지 않는다.
권한을 켜도 기본 브랜치에 직접 push하는 일은 없다.

말하지 않는 것도 있다:
- **"앱 전체가 정상입니다"** — 확인한 건 등록된 흐름 몇 개뿐이다. 확인한 개수를
  그대로 말한다.
- **머지만 하고 "고쳤습니다"** — 실서비스에서 다시 되는 걸 확인해야 그렇게 말한다.
- **근거 없는 성공률** — 수정 이력이 5건 미만이면 비율을 아예 보여주지 않는다.
  2건 중 2건을 "성공률 100%"라고 부르는 것은 사실이지만 정직하지 않다.
- **모르는 것을 아는 척** — 검증하지 못한 항목은 통과로 세지 않고 "확인하지
  못했습니다"라고 적는다. 흐름을 어느 역할이 하는지 모르면 주 사용자로 몰아주지
  않고 "정하지 못함"에 둔다.

---

## 4-7. PR 프리뷰 검사 켜기

GitHub App(또는 저장소 webhook)이 `deployment_status` 이벤트를 보내면 자동으로
동작한다. Vercel의 GitHub 연동이 프리뷰 배포를 끝낼 때마다 발생한다.

- GitHub App을 쓴다면 App 설정에서 **Deployment status** 이벤트를 구독에 추가한다.
- 저장소 webhook을 직접 걸었다면 이벤트 목록에 `deployment_status`를 더한다.

결과를 PR 댓글로 달려면 쓰기 연결이 필요하다. 없으면 결과는 VibeSafe 화면에만
남는다 — 기능이 죽지는 않고 값이 줄어들 뿐이다.

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

`prisma/schema.prisma`의 VibeSafe 구역. 30개 테이블 전부 `vibesafe_` 접두사.

핵심만:
- `VibesafeCriticalFlow.key` — baseline 비교의 축. 재분석해도 같은 흐름이면 같은 key.
- `VibesafeTestRun.dedupeKey` — 유니크. 중복 webhook·연타를 DB가 막는다.
- `VibesafeFlowBaseline` — "이 흐름은 이때 분명히 됐다". 회귀 판정의 기준.
- `VibesafeIncident` — 장애 1건 = 행 1개. 같은 장애가 이어지는 동안 늘지 않는다.
- `VibesafeNotification` — `(dedupeKey, channel)` 유니크로 알림 폭탄을 막는다.
- `VibesafeAppUserRole` — **분석 대상 앱을 쓰는 사람**(손님·사장님). USER 단계.
- `VibesafeUser.uiMode` — **VibeSafe 화면을 보는 사람**의 취향(simple/expert).
- `VibesafeFixProposal.status` — 수정 하나의 현재 위치. `applied ≠ 고쳐짐`.
- `VibesafeRepairOutcome` — 수정 한 건의 결말. 실패도 반드시 남긴다. 신뢰도
  엔진(`trust.ts`)과 수정 이력 화면이 둘 다 이 표를 원천으로 쓴다.

### ★ 판단 로직은 DB 접근과 분리한다

`repair/risk.ts`, `repair/pipeline.ts`, `trust-ladder.ts`처럼 "규칙을 정하는"
파일은 `"server-only"`도 prisma import도 없는 순수 함수다. `trust.ts`,
`repair/view.ts`처럼 "DB에서 모아오는" 파일은 그 순수 함수에 숫자만 넘긴다.
이렇게 나누는 이유는 규칙 하나를 확인하려고 매번 데이터베이스를 준비하지
않기 위해서다 — 순수 함수는 `node --test`로 바로 돌아간다(react-server
조건 불필요). DB 없이 실행되는 CI에서도 규칙 회귀를 잡을 수 있는 이유다.

### ★ 절대 섞으면 안 되는 두 값

`VibesafeAppUserRole`(앱을 쓰는 사람)과 `VibesafeUser.uiMode`(VibeSafe를 보는
사람의 화면 취향)는 이름이 비슷하지만 아무 관계가 없습니다.

"이 앱은 일반인이 쓰니 만든 사람도 초보겠군요"라는 추론은 자주 틀리고, 틀렸을 때
무례하며, 사용자가 왜 그런 화면을 보는지 알 길이 없습니다. 그래서 uiMode는
**물어보고 받은 답만** 저장하고, 저장소를 읽고 추론하지 않습니다.

`tests/unit/vibesafe/ui-mode.test.mjs`가 소스를 훑어 두 값 사이에 대입·인자·반환
경로가 생기면 테스트를 깨뜨립니다.

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
