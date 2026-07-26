# 수임체크 (SuimCheck)

소형 세무·기장 사무소용 **수임처 자료 요청** SaaS.

> 이 앱은 모노레포 `vowpath` 안의 **독립 사이트**입니다. 루트의 Effiroad와 코드·배포·도메인이 섞이지 않습니다.

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
| `/` | 랜딩 (왜 쓰는지 · 작동 방식 · 요금) |
| `/pricing` | 요금 |
| `/signup` · `/login` | 데모 세션 |
| `/dashboard` | 이번 달 제출 현황판 |
| `/dashboard/clients` | 수임처 등록 |
| `/dashboard/templates` | 정보성 알림톡 문구 미리보기 |
| `/dashboard/import` | CSV 가져오기 |

데모 데이터는 브라우저 `localStorage`에 저장됩니다. 알림톡 실발송(솔라피)은 온보딩·사업자·템플릿 심사 후 연동합니다.

## 배포 (Effiroad와 분리)

- Vercel/Cloudflare에서 **새 프로젝트** 생성
- Root Directory: `apps/docchase`
- 도메인: Effiroad(`effiroad.com`)와 다른 호스트 사용
