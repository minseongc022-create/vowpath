# Giu × Toss Payments — 한국 원화 결제

카드 · **카카오페이** · **네이버페이** · **토스페이** 를 하나의 결제 위젯으로 처리합니다.

## 1. 토스페이먼츠 가입

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 가입
2. **테스트 상점** 생성 → **클라이언트 키** / **시크릿 키** 발급
3. 결제위젯 연동키 사용 (Payment Widget v2)

## 2. Vercel 환경 변수

```bash
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
GIU_PAYMENT_DEMO=0
GIU_PAYMENT_PROVIDER=toss
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | 결제 위젯 (공개) |
| `TOSS_PAYMENTS_SECRET_KEY` | 결제 승인 API (비공개) |
| `GIU_PAYMENT_PROVIDER=toss` | Lemon Squeezy 대신 토스 우선 |

Redeploy after saving.

## 3. 확인

```bash
curl -s https://www.giucuu.com/api/giu/payments/config
```

Expect: `"backend":"toss"`, `"toss":true`, `"tossClientKey":"test_ck_..."`

## 4. 테스트 결제

1. 고객 로그인 → 박스 상세 → **원화 결제하기**
2. 위젯에서 카드 / 카카오 / 네이버 / 토스 중 선택
3. 테스트 키(`test_ck_`)면 실제 청구 없음
4. 성공 시 `/dat/{id}?paid=1` 픽업 코드 페이지

## 5. 라이브 전환

- 개발자센터에서 **라이브 키** 발급 후 Vercel env 교체
- 사업자등록 · 정산 계좌 등 토스페이먼츠 심사 완료 필요
- 위젯 관리자에서 노출할 결제수단(카카오/네이버/토스) 활성화

## API 흐름

1. `POST /api/giu/reservations` → pending 예약 생성 (`mode: toss`)
2. 클라이언트 Payment Widget → `requestPayment`
3. `GET /api/giu/payments/toss/confirm` → Toss `POST /v1/payments/confirm` → 픽업 코드 발급
