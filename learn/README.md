# EFFIROAD Learn — AI 초밀착 학습 플랫폼

기존 Effiroad(전화/디스패치) 제품과 **완전히 분리**된 교육 플랫폼 기초입니다.

## 시작하기

```bash
# 의존성 (루트 package.json)
npm install

# Prisma 클라이언트 생성
npm run learn:generate

# 데모 모드로 UI 체험 (DB/OAuth 불필요)
NEXT_PUBLIC_AUTH_DEMO=true npm run dev
```

브라우저에서 [http://localhost:3000/learn](http://localhost:3000/learn) 접속

## 구조

```
learn/                          # 플랫폼 전용 코드 (legacy와 분리)
  components/                   # UI 컴포넌트
  lib/                          # auth, db, supabase, demo-data
  styles/learn.css              # Toss-inspired 디자인 토큰
  types/

app/(learn)/learn/              # App Router 페이지
  (shell)/                      # 헤더 + 하단 네비
  (immersive)/                  # 전체화면 강의 뷰어
  api/                          # notes, planner, auth API

prisma/schema.prisma            # User, Note, Planner, Course, Mindmap...
```

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **YouTube형 레이아웃** | 영상/자료 중앙 + 우측 마인드맵·커리큘럼 (iPad 가로 최적화) |
| **Server Components** | 페이지 데이터는 서버에서 fetch → 빠른 초기 로드 |
| **Prisma + Supabase** | 필기·플래너 영구 저장 + Realtime 동기화 |
| **소셜 로그인** | Google / Kakao (NextAuth v5) |

## 환경 변수

`learn/.env.example` 참고. Supabase 프로젝트 생성 후:

1. `DATABASE_URL` / `DIRECT_URL` 설정
2. `npm run learn:migrate` 로 스키마 적용
3. Google/Kakao OAuth 앱 등록 후 키 입력
4. Supabase Realtime에서 `learn_notes`, `learn_planner_items` 테이블 publication 추가

## Supabase Realtime 설정

```sql
alter publication supabase_realtime add table learn_notes;
alter publication supabase_realtime add table learn_planner_items;
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/learn` | 랜딩 |
| `/learn/login` | 소셜 로그인 |
| `/learn/courses` | 강의 목록 |
| `/learn/courses/[slug]/lessons/[slug]` | 강의 뷰어 (YouTube형) |
| `/learn/planner` | 학습 플래너 |
| `/learn/notes` | 필기 모음 |
