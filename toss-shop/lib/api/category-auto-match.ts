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
  if (!process.env.OPENAI_API_KEY?.trim()) return false;
  return process.env.JARVIS_AUTO_CATEGORY !== "false";
}

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
}): Promise<CategoryAutoMatchResult> {
  const base = { engineVersion: CATEGORY_AUTO_MATCH_VERSION };

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

    const { node, confident, why } = await pickBranch({
      title: input.title,
      keyword: input.keyword,
      options,
    });
    if (!confident || !node) {
      return {
        ...base,
        confident: false,
        path,
        reason:
          `${path.length ? path.join(" > ") + " 아래에서 " : ""}확신할 수 있는 하위 카테고리를 찾지 못함` +
          (why ? ` — ${why}` : ""),
      };
    }

    path.push(node.name);

    if (node.isLeaf) {
      return { ...base, categoryId: node.id, confident: true, path, reason: `실시간 매칭: ${path.join(" > ")}` };
    }

    parentId = node.id;
  }

  return { ...base, confident: false, path, reason: `카테고리 트리가 ${MAX_DEPTH}단계 넘게 깊음 — 안전하게 중단` };
}
