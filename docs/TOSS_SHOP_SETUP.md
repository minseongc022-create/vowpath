# Effiroad 토스쇼핑 셀러 도구 — 설정

## vercel.json (자동 배포됨)

다음은 `vercel.json` → `build.env`에 포함되어 **push to main** 시 자동 적용됩니다.

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SELLER_PULSE_AT_ROOT` | `1` |
| `NEXT_PUBLIC_APP_URL` | `https://effiroad.com` |
| `TOSS_SHOP_OWNER_EMAILS` | `minseongc022@gmail.com` |
| `TOSS_SHOP_KRW_PER_USD` | `1350` |
| `TOSS_SHOP_PRO_ACTIVATION_CODE` | `effiroad-tspro-539d` |

## 도매꾹·도매매 (위탁 실공급가)

위탁 AI v5는 **도매꾹 Open API**로 실시간 공급가를 가져옵니다.

| Variable | Notes |
|----------|-------|
| `DOMEGGOOK_API_KEY` | [openapi.domeggook.com](https://openapi.domeggook.com) 발급 · `getItemList` |

미설정 시: 도매꾹·도매매 **검색 링크 + 시장 기반 추정가**로 동작 (입력 후 정밀도 상승).

## 월 수익 목표 (AI v5 genius)

| Variable | Default |
|----------|---------|
| `TOSS_SHOP_MONTHLY_GOAL_KRW` | `10000000` (월 1,000만 원) |

대시보드·수익 브리핑 API에서 목표 대비 진행률·12주 로드맵·genius 점수를 계산합니다.

## Vercel에 이미 있을 Lemon Squeezy (Effiroad 공용)

토스쇼핑 Pro 결제는 **기존 LS 키**를 재사용합니다. 별도 variant 없으면 `LEMON_SQUEEZY_VARIANT_ID_GIU`로 fallback (custom_price 10,000원).

| Variable | Required |
|----------|----------|
| `LEMON_SQUEEZY_API_KEY` | yes |
| `LEMON_SQUEEZY_STORE_ID` | yes |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | yes |
| `LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO` | optional (전용 구독 variant) |
| `LEMON_SQUEEZY_VARIANT_ID_GIU` | fallback checkout |

Webhook: `https://effiroad.com/api/lemon-squeezy/webhook`  
이벤트: `subscription_*`, `order_created` (tossShop custom_data)

## 토스쇼핑 API (본인 스토어 동기화)

셀러센터에서 발급 후 Vercel Production에 추가:

| Variable | Notes |
|----------|-------|
| `TOSS_SHOPPING_ACCESS_KEY` | FEP API |
| `TOSS_SHOPPING_SECRET_KEY` | FEP API |
| `TOSS_SHOPPING_SANDBOX` | `1` = 테스트 |

또는 대시보드 **설정 → API 연동**에서 계정별 저장 (Pro 필요).

## Cron

[cron-job.org](https://cron-job.org) 60초:

`GET https://effiroad.com/api/cron/toss-shop-sync`  
Header: `Authorization: Bearer $CRON_SECRET`

60초 sync에 **Jarvis Autopilot** 포함: 인증 SKU 초안 생성, 토스 주문 감지, 도매매 발주 준비.

## Jarvis Autopilot (v3)

| Variable | Default | Notes |
|----------|---------|-------|
| `JARVIS_AUTOPILOT_ENABLED` | `true` (vercel.json) | 60초 cron에서 autopilot 실행 |
| `JARVIS_AUTO_EXECUTE` | unset | `true` = OK 없이 자동 등록 (비권장) |
| `JARVIS_MATCHCUT_ENABLED` | `true` | Hookable/Matchcut 상세 |
| `TOSS_SHOP_DEFAULT_CATEGORY_ID` | — | 토스 등록 필수 |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID` | — | 토스 등록 필수 |

Health check: `GET /api/toss-shop/jarvis/health`  
Autopilot: `GET/POST /api/toss-shop/jarvis/autopilot`  
발주함: `GET /api/toss-shop/fulfillment`

## 스크립트

```bash
# Vercel runtime secrets push (토큰 있을 때)
VERCEL_TOKEN=... VERCEL_PROJECT_ID=... node scripts/toss-shop-production-env.mjs
```

## 플랜

| 플랜 | 조건 |
|------|------|
| Owner | `TOSS_SHOP_OWNER_EMAILS` 이메일 |
| Pro | LS 결제 / 활성화 코드 / `subscriptionStatus: active` |
| Free | 하루 키워드 3회 |
