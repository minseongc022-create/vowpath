# 기성확정 (GiseongConfirm)

민간 전문건설·하도급 **기성청구 승인 OS**.  
카톡·엑셀 대신 → 금액·누계·유보 링크 → 원청 승인 → 기성대장.

> 모노레포 `vowpath` 안 독립 사이트. Effiroad·수임체크·추가확정과 분리.

## 왜 이 시장인가

- 건설 매출 ~488조(2024) — 기성이 현금화 통로
- 공공 하도급지킴이 ≠ 민간 SMB 링크 승인 (ICP는 민간)
- 클로브급 무료 상위호환 없음 / AI전화 9/10 전쟁 회피
- 추가공사보다 업체 풀·사건당 금액이 큼

상세·정직한 한계: `docs/MARKET_PICK.md`

## 실행

```bash
cd apps/giseong
npm install
npm run dev
```

http://localhost:3003

## 경로

| 경로 | 역할 |
|------|------|
| `/` | 랜딩 |
| `/pricing` | 요금 4.9 / 7.9 / 12.9만 |
| `/dashboard` | 오늘 기성 |
| `/dashboard/new` | 기성 만들기 |
| `/p/[token]` | 원청 승인 (앱 없음) |

데모 토큰 예: `/p/demo_songpa_g4`
