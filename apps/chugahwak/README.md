# 추가확정 (ChugaConfirm)

인테리어·리모델링 **추가공사 합의 OS**.  
카톡·구두 지시 대신 → 금액 링크 → 고객 승인 → 변경대장.

> 모노레포 `vowpath` 안 독립 사이트. Effiroad·수임체크와 분리.

## 왜 이 사업인가

- 클로브급 **무료 상위호환 없음** (수집이 아니라 합의)
- Jobber에도 CO가 애매 / 한국은 판례상 서면 합의 필수인데 실무는 엉망
- 놓친 추가공사 1건이 구독 1년치

상세: `docs/MARKET_PICK.md`

## 실행

```bash
cd apps/chugahwak
npm install
npm run dev
```

http://localhost:3002

## 경로

| 경로 | 역할 |
|------|------|
| `/` | 랜딩 |
| `/pricing` | 요금 3.9 / 6.9 / 9.9만 |
| `/dashboard` | 오늘 합의 |
| `/dashboard/new` | 변경 만들기 |
| `/c/[token]` | 고객 승인 (앱 없음) |

데모 토큰 예: `/c/demo_cafe_co1`
