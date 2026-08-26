/**
 * 카테고리 자동 매칭 — 상품마다 실제 토스 카테고리 트리를 실시간으로 내려가며 찾는다
 *
 * ★ 왜 static map으로는 안 되는가
 * 토스 최상위 카테고리는 15개뿐이고 전부 "하위 보기"가 필요한 비-리프다
 * (등록 가능한 리프 카테고리는 훨씬 아래에 있다). 우리 내부 분류는 6개
 * (식품/뷰티/생활/디지털/패션/건강)뿐인데, "생활" 하나만 봐도 실제로는
 * 가구/홈데코·생활용품·주방용품 세 갈래로 갈린다. "여러 카테고리를 돈 되는
 * 대로 다 판다"는 전략에서는 정적 매핑 몇 개로 커버가 안 된다 — 상품마다
 * 실제 트리에서 맞는 리프를 찾아야 한다.
 *
 * ★ 왜 문자열 매칭이 아니라 LLM인가
 * "세럼"이 "뷰티" 밑에 있다는 건 카테고리명에 부분일치가 없다 — 도메인
 * 지식이 필요하다. 그렇다고 아무 카테고리나 만들어 붙이면(추측) 잘못된
 * 카테고리 등록 → 노출 저하·페널티다. 그래서 **실제 트리에 있는 선택지
 * 중에서만 고르게** 강제한다. LLM이 트리에 없는 ID를 답하면 그 응답은
 * 버린다 — 지어낸 카테고리는 없는 카테고리보다 위험하다.
 *
 * ★ fail-closed
 * 확신이 안 서면(모델이 "모르겠다"거나, 리프에 못 닿거나, 깊이 제한 초과)
 * 매칭 실패로 남긴다. 그러면 category-resolver.ts가 정적 매핑·기본값으로
 * 폴백한다 — 폴백 자체는 안전하게 이미 설계돼 있다(fail-closed).
 */

import type { TossApiConfig } from "./config";
import { listTossCategories, type TossCategoryNode } from "./category-lookup";

export const CATEGORY_AUTO_MATCH_VERSION = "1.0";

const MAX_DEPTH = 6;

export type CategoryAutoMatchResult = {
  engineVersion: string;
  categoryId?: number;
  /** 최상위부터 선택된 경로 (사람이 읽는 이름) — 사후 검증용 */
  path: string[];
  confident: boolean;
  reason: string;
};

export function autoCategoryMatchEnabled(): boolean {
  // LLM 키가 없어도 이름 대조 폴백으로 내려갈 수 있으므로 켜둔다.
  // (종전엔 키가 없으면 매칭 자체를 포기했다 — 그러면 등록이 통째로 막힌다.)
  return process.env.JARVIS_AUTO_CATEGORY !== "false";
}

/**
 * 내부 6분류 → 토스 최상위 카테고리 이름의 단서.
 *
 * 최상위만 이 표를 쓴다. 최상위는 15개 남짓이고 우리 분류와 뜻이 거의
 * 그대로 겹쳐서 이름 대조가 확실하기 때문이다. 그 아래로는 이 표를 안 쓴다 —
 * 깊은 곳은 "세럼이 뷰티 밑"처럼 이름만으로는 알 수 없어서, 상품명과 실제로
 * 겹치는 낱말이 있을 때만 내려간다.
 */
const ROOT_NAME_HINTS: Record<string, string[]> = {
  food: ["식품", "먹거리", "신선", "가공식품"],
  beauty: ["뷰티", "화장품", "미용"],
  home: ["생활", "주방", "가구", "홈", "인테리어"],
  digital: ["디지털", "가전", "컴퓨터", "모바일", "전자"],
  fashion: ["패션", "의류", "잡화", "신발", "가방"],
  health: ["건강", "헬스", "의료", "영양"],
};

/** 낱말 단위로 쪼갠다 — 한글/숫자/영문 덩어리만 남긴다 */
function tokens(text: string): string[] {
  return (text.match(/[가-힣]{2,}|[a-zA-Z]{3,}|\d+/g) ?? []).map((t) => t.toLowerCase());
}

/**
 * 이름 대조로 한 단계를 고른다 — LLM 없이.
 *
 * ★ 왜 필요한가
 * OpenAI 크레딧이 떨어지자 카테고리 매칭이 전부 실패하고, 그 순간 등록이
 * 통째로 멈췄다(429 insufficient_quota). 카테고리 고르기 하나 때문에 매출
 * 파이프라인 전체가 외부 유료 API에 묶여 있으면 안 된다.
 *
 * ★ 지어내지 않는다
 * 실제 트리의 선택지 중에서만 고르고, 상품명과 **실제로 겹치는 낱말**이
 * 있을 때만 고른다. 겹치는 게 없으면 고르지 않는다 — 잘못된 카테고리 등록은
 * 노출 저하·페널티로 이어지므로, 못 고르는 편이 낫다(fail-closed).
 */
function pickBranchByName(input: {
  title: string;
  keyword: string;
  category?: string;
  options: TossCategoryNode[];
  isRoot: boolean;
}): { node?: TossCategoryNode; why?: string } {
  if (input.isRoot && input.category) {
    const hints = ROOT_NAME_HINTS[input.category] ?? [];
    const hit = input.options.find((o) => hints.some((h) => o.name.includes(h)));
    if (hit) return { node: hit };
    return { why: `최상위에서 "${input.category}"에 맞는 이름을 못 찾음` };
  }

  // 상품명 낱말에 더해, 그 낱말이 흔히 속하는 분류어까지 넓혀서 본다.
  //
  // "집게"라는 낱말은 "주방용품"과 한 글자도 안 겹친다. 사람은 집게가
  // 주방용품인 걸 알지만 문자열 대조로는 알 수 없다 — 그래서 AI를 썼다.
  // AI가 안 될 때를 대비해, 위탁에서 자주 나오는 낱말만 최소한으로 넓힌다.
  const words = new Set([...tokens(input.title), ...tokens(input.keyword)]);
  for (const w of [...words]) {
    for (const syn of TERM_EXPANSIONS[w] ?? []) words.add(syn);
  }

  let best: { node: TossCategoryNode; score: number } | undefined;
  for (const o of input.options) {
    let score = 0;
    for (const t of tokens(o.name)) {
      // 양방향 부분일치: "주방용품"과 "주방", "조리도구"와 "조리"가 걸리게
      for (const w of words) {
        if (t === w || t.includes(w) || w.includes(t)) score += 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { node: o, score };
  }
  if (best) return { node: best.node };

  // 겹치는 이름이 하나도 없을 때 — "기타"류가 있으면 그리로 간다.
  //
  // 이건 지어내는 게 아니라 **맞는 선택**이다. 어느 세부 분류에도 속하지
  // 않는 상품을 위해 토스가 만들어 둔 자리이기 때문이다. 최상위에서는
  // 쓰지 않는다(대분류를 기타로 넣으면 그 아래가 통째로 어긋난다).
  if (!input.isRoot) {
    const etc = input.options.find((o) => /기타|그 외|일반/.test(o.name));
    if (etc) return { node: etc };
  }

  // 무엇 중에서 못 골랐는지 남긴다 — 이게 없으면 사전을 어떻게 보완해야
  // 할지 알 수가 없다. 추측 대신 실제 선택지를 보고 고친다.
  const names = input.options.slice(0, 12).map((o) => o.name).join(", ");
  return { why: `상품명과 겹치는 카테고리 이름이 없음 [선택지: ${names}]` };
}

/**
 * 낱말 → 흔히 속하는 분류어.
 *
 * 문자열 대조의 한계를 최소한으로 메운다. "집게"는 "주방용품"과 한 글자도
 * 안 겹치기 때문이다. 넓게 만들수록 오분류 위험이 커지므로, 위탁에서 실제로
 * 자주 나오는 것만 담고 애매한 건 넣지 않는다.
 */
const TERM_EXPANSIONS: Record<string, string[]> = {
  // 주방
  집게: ["주방", "조리"], 국자: ["주방", "조리"], 뒤집개: ["주방", "조리"],
  도마: ["주방", "조리"], 밀폐용기: ["주방", "보관"], 수저: ["주방", "식기"],
  텀블러: ["주방", "컵"], 프라이팬: ["주방", "조리"], 냄비: ["주방", "조리"],
  // 청소·생활
  걸레: ["청소"], 밀대: ["청소"], 수세미: ["청소", "주방"],
  옷걸이: ["생활", "수납"], 정리함: ["수납", "생활"], 선반: ["수납", "가구"],
  // 욕실
  칫솔: ["욕실", "구강"], 샤워기: ["욕실"], 발매트: ["욕실", "매트"],
  // 뷰티
  크림: ["스킨케어", "기초"], 세럼: ["스킨케어", "기초"], 토너: ["스킨케어", "기초"],
  선크림: ["선케어", "스킨케어"], 마스크팩: ["마스크", "스킨케어"],
  // 디지털
  케이블: ["케이블", "액세서리"], 충전기: ["충전", "액세서리"],
  이어폰: ["이어폰", "음향"], 마우스: ["마우스", "주변기기"],
  거치대: ["거치대", "액세서리"],
  // 패션
  양말: ["양말", "언더웨어"], 장갑: ["장갑", "잡화"], 모자: ["모자", "잡화"],
};

// 트리 구조는 자주 바뀌지 않는다 — 프로세스 생애주기 동안 캐시해 상품마다
// 반복 조회하지 않는다. merchantId별로 나눠 캐시 키를 만든다.
const childrenCache = new Map<string, TossCategoryNode[]>();

async function fetchChildrenCached(
  merchantId: string,
  config: TossApiConfig,
  parentId: number | undefined,
): Promise<TossCategoryNode[]> {
  const cacheKey = `${merchantId}:${parentId ?? "root"}`;
  const cached = childrenCache.get(cacheKey);
  if (cached) return cached;

  const { nodes } = await listTossCategories(merchantId, config, parentId);
  childrenCache.set(cacheKey, nodes);
  return nodes;
}

/** 테스트·핫리로드용 */
export function clearCategoryAutoMatchCache(): void {
  childrenCache.clear();
}

/**
 * 한 단계에서 LLM에게 실제 옵션 중 하나를 고르게 한다.
 * 응답이 옵션 목록에 없는 id를 가리키면 무효로 처리한다(지어낸 카테고리 방지).
 */
async function pickBranch(input: {
  title: string;
  keyword: string;
  options: TossCategoryNode[];
}): Promise<{ node?: TossCategoryNode; confident: boolean; why?: string }> {
  // 실패 사유를 구분해서 돌려준다. 종전엔 여섯 갈래가 전부 똑같은
  // `confident: false`였다 — 키가 문제인지, 모델 호출이 거절당한 건지,
  // 모델이 정말 못 고른 건지 알 수가 없어 손댈 곳을 못 찾는다.
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { confident: false, why: "OPENAI_API_KEY 없음" };
  if (!input.options.length) return { confident: false, why: "선택지 없음" };

  const optionList = input.options
    .map((o) => `- id=${o.id}: ${o.name}${o.isLeaf ? " (등록 가능·최종)" : ""}`)
    .join("\n");

  const prompt =
    `다음 상품이 속할 가장 알맞은 카테고리를 아래 목록에서 딱 하나만 고르세요.\n` +
    `목록에 없는 카테고리를 만들어내면 안 됩니다. 확실하지 않으면 matched를 false로 답하세요.\n\n` +
    `상품명: ${input.title}\n검색 키워드: ${input.keyword}\n\n` +
    `선택지:\n${optionList}\n\n` +
    `JSON으로만 답하세요: {"id": 선택한 id 숫자, "matched": true} 또는 {"matched": false}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.JARVIS_OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { confident: false, why: `OpenAI ${res.status} ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return { confident: false, why: "OpenAI 응답 본문 비어 있음" };

    const parsed = JSON.parse(raw) as { id?: number; matched?: boolean };
    if (!parsed.matched || typeof parsed.id !== "number") {
      return { confident: false, why: `모델이 고르지 못함 (${raw.slice(0, 120)})` };
    }

    // 트리에 실제로 있는 옵션인지 검증 — 이게 없으면 지어낸 카테고리가 샌다
    const node = input.options.find((o) => o.id === parsed.id);
    if (!node) return { confident: false, why: `트리에 없는 id=${parsed.id}` };

    return { node, confident: true };
  } catch (e) {
    return { confident: false, why: `OpenAI 호출 실패 — ${e instanceof Error ? e.message : "알 수 없음"}` };
  }
}

/**
 * 트리를 위에서부터 내려가며 리프 카테고리를 찾는다.
 * 각 단계마다 실제 옵션 중에서만 고르게 강제하므로, 지어낸 카테고리 ID가
 * 나올 수 없다 — 최악의 경우도 "못 찾음"이지 "잘못 찾음"이 아니다.
 */
export async function autoMatchCategoryId(input: {
  merchantId: string;
  config: TossApiConfig;
  title: string;
  keyword: string;
  /** 내부 6분류 — 최상위 카테고리를 이름으로 좁힐 때만 쓴다 */
  category?: string;
}): Promise<CategoryAutoMatchResult> {
  const base = { engineVersion: CATEGORY_AUTO_MATCH_VERSION };
  let matchedByName = false;

  if (!autoCategoryMatchEnabled()) {
    return { ...base, confident: false, path: [], reason: "카테고리 자동 매칭 비활성 (OPENAI_API_KEY 필요)" };
  }

  const path: string[] = [];
  let parentId: number | undefined;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    let options: TossCategoryNode[];
    try {
      options = await fetchChildrenCached(input.merchantId, input.config, parentId);
    } catch (e) {
      return {
        ...base,
        confident: false,
        path,
        reason: `카테고리 트리 조회 실패 — ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
      };
    }

    if (!options.length) {
      return { ...base, confident: false, path, reason: "더 내려갈 하위 카테고리가 없음" };
    }

    // 1순위 LLM. 실패하면 이름 대조로 한 번 더 시도한다.
    //
    // LLM만 믿으면 크레딧이 떨어지는 순간 등록이 통째로 멈춘다 — 실제로
    // 그렇게 멈췄다(OpenAI 429 "no credits remaining"). 카테고리 하나 고르는
    // 일로 매출 파이프라인 전체가 외부 유료 API에 묶여 있으면 안 된다.
    const llm = await pickBranch({
      title: input.title,
      keyword: input.keyword,
      options,
    });

    let node = llm.confident ? llm.node : undefined;
    let via = "AI";
    let why = llm.why;

    if (!node) {
      const byName = pickBranchByName({
        title: input.title,
        keyword: input.keyword,
        category: input.category,
        options,
        isRoot: depth === 0,
      });
      if (byName.node) {
        node = byName.node;
        via = "이름 대조";
      } else {
        why = `${why ?? "AI 실패"} / 이름 대조도 실패 — ${byName.why}`;
      }
    }

    if (!node) {
      return {
        ...base,
        confident: false,
        path,
        reason:
          `${path.length ? path.join(" > ") + " 아래에서 " : ""}확신할 수 있는 하위 카테고리를 찾지 못함` +
          (why ? ` — ${why}` : ""),
      };
    }
    if (via === "이름 대조") matchedByName = true;

    path.push(node.name);

    if (node.isLeaf) {
      return {
        ...base,
        categoryId: node.id,
        confident: true,
        path,
        reason: `실시간 매칭${matchedByName ? "(이름 대조 포함)" : ""}: ${path.join(" > ")}`,
      };
    }

    parentId = node.id;
  }

  return { ...base, confident: false, path, reason: `카테고리 트리가 ${MAX_DEPTH}단계 넘게 깊음 — 안전하게 중단` };
}

/** 테스트 전용 — 이름 대조 폴백을 직접 검증한다 */
export const __pickBranchByNameForTest = pickBranchByName;
