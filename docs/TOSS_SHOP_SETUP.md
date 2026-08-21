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
