# Haruwith ClawOps 전화 예약 운영 가이드

## 구현 경계

한국 출시의 식당 예약 실행은 `Haruwith Brain/Plan -> Reservation Batch/Job -> persistent Queue -> ClawOps managed Agent -> signed status callback/transcript -> structured result -> Plan` 순서다. 네이버예약·캐치테이블 API는 이 경로의 의존성이 아니다.

`dajeong/lib/reservation-provider-router.ts`가 장기 provider 경계다. 현재 전화번호가 확인된 한국 식당은 `clawops_phone`, 향후 Haruwith 입점 업체는 `haruwith_direct`, 계약된 온라인 사업자는 `partner_online`, 실행할 수 없는 방식은 `manual`로 분리한다.

## ClawOps에서 발급·설정할 값

공식 Node SDK `@teamlearners/clawops`의 managed Agent call API를 사용한다.

1. ClawOps 계정에서 API key(`sk_...`)와 Account ID(`AC...`)를 발급한다.
2. 한국 발신이 가능한 전화번호를 provision하고 E.164 형식의 발신번호를 확인한다.
3. 한국어 예약 대화를 수행할 managed Agent를 만들고 Agent ID를 확인한다. 예약별 목표와 권한 경계는 `callContext.instruction`과 `variables`로 전달된다.
4. webhook signing key를 발급한다.
5. 통화 transcript 기능을 활성화한다. transcript가 `not_requested`이면 worker가 공식 transcript request API를 호출한다.
6. 아래 공개 HTTPS callback URL을 ClawOps에서 접근할 수 있게 한다.

```text
https://<HARUWITH_PUBLIC_BASE_URL>/api/dajeong/reservations/clawops/webhook
```

코드가 사용하는 공식 SDK 동작은 다음과 같다.

- 시작: `client.calls.create({ to, from, agentId, callContext, statusCallback, statusCallbackEvent, timeout, machineDetection })`
- 상태: `client.calls.get(callId)`
- 4분 강제 종료: `client.calls.update(callId, { status: "completed" })`
- transcript: `client.calls.getTranscript(callId)` / `client.calls.requestTranscript(callId)`
- callback 검증: `client.webhooks.verify({ url, params, signature, signingKey })`

ClawOps의 `completed`는 통화 연결 생명주기가 끝났다는 뜻이지 예약 성공이 아니다. Haruwith는 transcript의 날짜·시간·인원·예약자명 최종 재확인과 confidence를 별도로 검사한 뒤에만 `succeeded/booked`로 바꾼다.

## 환경변수

```dotenv
CLAWOPS_API_KEY=sk_...
CLAWOPS_ACCOUNT_ID=AC...
CLAWOPS_FROM_NUMBER=+82...
CLAWOPS_AGENT_ID=...
CLAWOPS_SIGNING_KEY=...
# 공식 기본 API를 쓸 때는 비워 둔다.
CLAWOPS_BASE_URL=

HARUWITH_PUBLIC_BASE_URL=https://your-domain.example
HARUWITH_RESERVATION_CONCURRENCY=1
HARUWITH_MONTHLY_MINUTE_ALLOWANCE=100
HARUWITH_WORKER_TOKEN=<long-random-secret>
HARUWITH_WORKER_POLL_MS=5000
HARUWITH_RESERVATION_RESULT_MODEL=gpt-4o-mini
HARUWITH_OPS_TOKEN=<long-random-secret>

KV_REST_API_URL=...
KV_REST_API_TOKEN=...
OPENAI_API_KEY=...
```

Individual 출시에서는 `HARUWITH_RESERVATION_CONCURRENCY=1`로 둔다. Business 업그레이드 후 값만 올리면 같은 queue가 capacity만큼 원자적으로 claim한다. 코드에 1이 고정되어 있지 않으며 안전 상한은 50이다.

`OPENAI_API_KEY`는 통화 transcript를 Haruwith structured result로 바꾸는 데 사용한다. 키가 없거나 구조화에 실패하면 예약 성공으로 추정하지 않고 `needs_user_action`으로 남긴다.

프로덕션 실제 전화에는 Vercel KV가 필수다. KV가 없으면 POST endpoint는 503을 반환하므로 서버 재시작 뒤 작업을 잃은 채 전화하는 일이 없다.

## worker 실행

Vercel Hobby cron에는 초·분 단위 schedule을 추가하지 않는다. callback이 종료 시 즉시 tick을 유도하지만, 무응답·worker crash·4분 종료·재시도를 보장하려면 별도의 상시 worker 프로세스를 배포한다.

```bash
npm run haruwith:reservation-worker
```

worker는 기본 5초마다 `POST /api/cron/haruwith-reservations`를 호출하며 이전 tick과 겹치지 않는다. `Authorization: Bearer <HARUWITH_WORKER_TOKEN>`이 필요하다. 서버리스 callback만으로 운영하면 callback이 오지 않은 통화의 240초 강제 종료를 보장할 수 없으므로 출시 구성으로 인정하지 않는다.

## queue와 중복 방지

- Batch idempotency key: owner + plan + order + client request key의 SHA-256
- Job idempotency key: batch key + task id
- 분산 lock: Vercel KV `SET NX PX`
- webhook dedupe: call id + status + provider timestamp + duration
- 통화 시작 응답 저장 전 worker가 죽으면 결과가 불명확하므로 자동 재통화하지 않는다.
- ClawOps call create에는 예약전화용 idempotency key가 문서화되어 있지 않으므로 SDK POST 자동 재시도를 끈다. 생성 응답이 유실된 경우에도 자동 재요청하지 않는다.
- 직원 연결 후 통화가 끊긴 경우도 중복 예약 위험 때문에 자동 재통화하지 않는다.
- 연결 전 busy/no-answer/일시적 통신 장애만 최대 3회까지 지연 재시도한다.
- invalid number, number changed, incompatible destination은 자동 재시도하지 않는다.

## 180초/240초 정책

Agent instruction은 165초부터 핵심 결론과 마지막 readback으로 수렴하고 225초부터 미확정 조건을 정리해 종료하도록 지시한다. 별개로 Haruwith worker가 시작 시 `targetDeadlineAt=180초`, `absoluteDeadlineAt=240초`를 저장하고 240초에 실제 provider terminate API를 호출한다. 종료 시점까지 확정이 불분명하면 성공으로 기록하지 않는다.

## 금전·개인정보

- HARD 조건 변경, 새 예약금, 좌석 추가금, 최소주문, 선결제, 코스 선주문, 중대한 취소조건은 Agent가 승인하지 않는다.
- 화면에서 업체명·조건·정확한 원화 금액을 포함한 명시적 승인이 필요하다.
- 승인을 기록해도 안전한 송금/PG 연동이 없으므로 `결제 완료`나 `예약 완료`로 바꾸지 않는다.
- raw 카드번호/CVV/계좌 비밀번호를 Agent에 전달하지 않는다.
- 이름과 전화번호는 해당 예약 목적의 별도 동의를 받은 뒤 직원이 요구할 때만 제공한다.

## 알림과 운영 지표

완료·부분완료·승인필요·실패 알림은 항상 in-app 상태로 저장된다. 외부 push/notification provider를 붙이려면 다음을 설정한다.

```dotenv
HARUWITH_NOTIFICATION_WEBHOOK_URL=https://notification-provider.example/haruwith
HARUWITH_NOTIFICATION_WEBHOOK_SECRET=...
```

payload는 `x-haruwith-signature` HMAC-SHA256으로 서명된다. 실제 APNs/FCM provider 계약·credential이 없으면 in-app 외 전달을 완료로 표시하지 않는다.

운영 지표는 `GET /api/dajeong/reservations/metrics`에서 `Authorization: Bearer <HARUWITH_OPS_TOKEN>`으로 조회한다. 총 요청·전화·발신분·이번 달 발신분·평균 통화시간·3분 이내율·4분 도달률·성공률·첫 통화 성공률·retry·busy/no answer·승인필요·평균/p95 대기·queue depth·성공 예약당 분·Individual 월 100분 사용률을 제공한다.

## Ads V1 설정

`HARUWITH_ADS_ADMIN_TOKEN`으로 운영자 campaign endpoint를 보호하고, `HARUWITH_ADS_SIGNING_SECRET`으로 impression attribution token을 서명한다. 광고에는 region/category/occasion/budget bucket만 전달하며 원문 대화나 사람 프로필은 전달하지 않는다.

광고 노출은 verified merchant, 일정 기간, 총/일예산, impression cap, 현재 intent 관련성을 모두 통과해야 한다. `Sponsored · 광고` 표시와 “추천 순위에 영향 없음” 문구가 항상 붙는다. 광고 creative는 Plan item에 삽입되지 않으며 organic 추천과 별도 상태에 저장된다. impression -> click -> plan_add -> reservation_attempt -> reservation_success -> conversion 이벤트를 같은 서명 token으로 연결한다.

## 출시 전 수동 확인

1. 실제 ClawOps credential을 production 환경에 등록한다.
2. 공개 callback URL과 서명 검증을 ClawOps test call로 확인한다.
3. 한국 발신번호·AI 통화 고지·녹취/보관 정책을 법무/통신 운영 기준에 맞춰 확인한다.
4. 상시 worker와 Vercel KV를 배포하고 worker 장애 알림을 연결한다.
5. 테스트용 본인/협조 매장 번호로 성공·busy·no-answer·끊김·예약금 시나리오를 검증한다. 자동테스트에서는 실제 식당에 전화하지 않는다.
6. 실제 push가 필요하면 notification webhook 수신부에서 APNs/FCM credential과 사용자 device token을 연결한다.
