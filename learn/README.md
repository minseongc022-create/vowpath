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
  lib/                          # auth, db, supabase, ingest engine
  styles/learn.css              # Toss-inspired 디자인 토큰
  types/

app/(learn)/learn/              # App Router 페이지
  (shell)/                      # 헤더 + 하단 네비
  (immersive)/                  # 전체화면 강의 뷰어
  api/                          # notes, planner, library, auth API

prisma/schema.prisma            # User, Material, Note, Planner, Course...
```

## AI 자료 소화 엔진

| 단계 | 설명 |
|------|------|
| **EXTRACT** | YouTube 자막 / PDF 텍스트 / 붙여넣기 텍스트 추출 |
| **CHUNK** | 10분·5500자 단위 분할 + 280자 오버랩 |
| **TRANSCRIBE** | 청크별 OpenAI 정제 → 겹침 dedup 병합 → **끊김 없는 전체 스크립트** |
| **ANALYZE** | 주제별 **전체 핵심 bullet** 추출 (장문 요약 없음) + 마인드맵 |
| **Whisper** | YouTube 자막 없을 때 OpenAI Whisper 자동 전사 (10분 청크) |
| **강의 연동** | 저장소 ↔ 강의 뷰어 사이드바 (핵심·마인드맵·YouTube embed) |

### 지원 입력
- **YouTube URL** (+ 자막 없을 때 스크립트 붙여넣기)
- **PDF 업로드**
- **외부 유료 강의 텍스트 / 필기** 붙여넣기
- **기존 자료에 텍스트 추가 결합** (재분석)

### API
- `POST /learn/api/library` — 자료 추가 + ingest 시작
- `GET /learn/api/library?q=` — 저장소 검색
- `GET /learn/api/library/[id]` — 상세 (스크립트, 요약, 마인드맵)
- `POST /learn/api/library/[id]` — `{ action: "append", text }` 외부 자료 결합

`OPENAI_API_KEY` 없으면 데모 분석으로 동작합니다.

## React Flow 인터랙티브 마인드맵

| 기능 | 설명 |
|------|------|
| **양방향 싱크** | 노드 클릭 → YouTube `seekTo` + 스크립트 `scrollIntoView` |
| **실시간 트래킹** | `requestAnimationFrame` + `getCurrentTime` → 재생 중 노드 하이라이트 |
| **디지털 필기** | 마인드맵 위 sticky note 레이어 (드래그·저장) |
| **MiniMap + Controls** | 전체 구조 탐색 |
| **강의 연동** | Lesson viewer 사이드바 Live Sync |

라우트: `/learn/library/[id]/mindmap`

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **나만의 학습 저장소** | 모든 외부 자료를 한곳에 통합·검색 |
| **YouTube형 레이아웃** | 영상/자료 중앙 + 우측 마인드맵·커리큘럼 (iPad 가로 최적화) |
| **Server Components** | 페이지 데이터는 서버에서 fetch → 빠른 초기 로드 |
| **Prisma + Supabase** | 필기·플래너·자료 영구 저장 + Realtime 동기화 |
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
| `/learn/library` | **나만의 학습 저장소** (AI ingest) |
| `/learn/library/[id]/mindmap` | **React Flow 인터랙티브 마인드맵** 대시보드 |
| `/learn/login` | 소셜 로그인 |
| `/learn/courses` | 강의 목록 |
| `/learn/courses/[slug]/lessons/[slug]` | 강의 뷰어 (YouTube형) |
| `/learn/planner` | 학습 플래너 |
| `/learn/notes` | 필기 모음 |
