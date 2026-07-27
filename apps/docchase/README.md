# 수임체크 (SuimCheck)

소형~중형 세무·기장 사무소용 **수임처 자료 요청** SaaS.

> 이 앱은 모노레포 `vowpath` 안의 **독립 사이트**입니다. 루트의 Effiroad와 코드·배포·도메인이 섞이지 않습니다.

## 플랜 (데모 게이팅)

| 플랜 | 월요금 | 거래처 | 알림톡 포함 | 핵심 |
|------|--------|--------|-------------|------|
| 라이트 | 49,000 | 25 | 80 | 수동 요청·현황판 |
| 스탠다드 | 99,000 | 80 | 350 | 제출 링크 · 자동 독촉 · 일괄 발송 |
| 프로 | 179,000 | 250 | 1,200 | 맞춤 문구 · CSV 리포트 · 담당 5명 |

초과 알림톡 15~20원/건 (원가≈13원대, 얇은 메시지 마진 + 구독 마진).

## 로컬 실행

```bash
cd apps/docchase
npm install
npm run dev
```

http://localhost:3001

## 구성

| 경로 | 역할 |
|------|------|
| `/` | 랜딩 |
| `/pricing` | 요금 |
| `/signup` · `/login` | 플랜 선택 데모 세션 |
| `/dashboard` | 오늘 독촉 · 파일 도착 |
| `/dashboard/clients` | 거래처 |
| `/dashboard/templates` | 알림톡 미리보기 |
| `/dashboard/import` | CSV 명단 |
| `/dashboard/settings` | 플랜·자동 독촉·CSV |
| `/s/[token]` | 수임처 제출 (앱 설치 없음) |

데모 데이터는 브라우저 `localStorage`에 저장됩니다. 알림톡 실발송(솔라피)은 온보딩·사업자·템플릿 심사 후 연동합니다.

## 배포 (Effiroad와 분리)

- Vercel/Cloudflare에서 **새 프로젝트** 생성
- Root Directory: `apps/docchase`
- 도메인: Effiroad(`effiroad.com`)와 다른 호스트 사용
