# hookable-engine

Hookable(AI 이커머스 상세페이지 자동 생성 서비스)의 **기능**만 독립적으로
재현한 서버사이드 모듈입니다. toss-shop 코드와는 어떤 방향으로도 import하지
않습니다 — 지금은 완전히 격리돼 있고, 나중에 연결한다면 `index.ts`가 내보내는
공개 함수(`generateHookableDetailPage`)를 통해서만 연결해야 합니다.

## 파이프라인

Hookable 워크플로: 상품입력 → 기획 → 생성 → 수정 → 내보내기

| 단계 | 파일 | 하는 일 |
| --- | --- | --- |
| 입력 | `types.ts` | `ProductInput` — 상품명·카테고리·가격·특징·이미지 |
| 기획 | `market-analysis.ts` | AI로 시장 트렌드·경쟁 인사이트·소비자 니즈 분석 → 판매 소구점 도출 |
| 기획 | `section-planner.ts` | 9개 섹션(hook~cta) 순서 고정 계획 |
| 생성 | `copywriter.ts` | 섹션별 AI 카피(헤딩/본문/표/FAQ) |
| 생성 | `layout-objects.ts` | 텍스트·이미지·섹션을 편집 가능한 "코드 객체"로 조립 |
| 생성 | `html-renderer.ts` | 코드 객체 → 최종 HTML (레이아웃은 코드가 고정) |
| 생성 | `gif-generator.ts` | 실제 상품 사진들을 이어붙여 애니메이션 GIF 생성 (sharp) |
| 내보내기 | `index.ts` | 위 전부를 실행해 `HookableGenerationResult` 반환 |

"수정"(드래그앤드롭 캔버스 편집 UI)은 이번 요청 범위(기능만) 밖이라 만들지
않았습니다. 대신 `document.objects`가 캔버스가 편집할 최소 단위(텍스트/이미지/
섹션/표/QA 객체)를 그대로 나타내므로, 나중에 편집 UI를 얹을 때 이 구조를 그대로
쓸 수 있습니다.

## 사용법

```ts
import { generateHookableDetailPage } from "@/hookable-engine";

const result = await generateHookableDetailPage({
  name: "무선 이어폰 프로",
  category: "이어폰",
  priceKrw: 39000,
  features: ["노이즈캔슬링", "24시간 배터리", "IPX7 방수"],
  imageUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
});

result.html;          // 완성된 상세페이지 HTML
result.gif?.dataUrl;  // 자동 생성된 GIF (data URL)
result.document;      // 편집 가능한 코드 객체 트리
result.marketAnalysis; // AI가 도출한 시장 분석/셀링포인트
```

## 검증

`OPENAI_API_KEY`가 없거나 호출이 실패해도 모든 단계가 휴리스틱 폴백으로
동작합니다 (`meta.aiUsed`로 AI 사용 여부 확인 가능). 웹으로 직접 확인하려면
`/hookable-engine-test` 페이지를 사용하세요 (`app/hookable-engine-test/`).
