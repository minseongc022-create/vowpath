/**
 * 셀링포인트 문장 다듬기 — 사실은 그대로, 문장만 카피라이터급으로
 *
 * ★ 왜 필요한가
 *
 * buyer-psychology.ts가 만드는 셀링포인트는 규칙 기반이라 사실은 정확하지만
 * 문장이 기계적이다: "같은 조건 상품 평균가보다 12% 낮은 가격입니다." 같은
 * 문장은 정보로는 충분해도 후커블·드랩류가 주는 "다듬어진 카피" 느낌은 없다.
 *
 * ★ 왜 레이아웃은 안 건드리고 문장만 건드리는가
 *
 * detail-page-engine.ts에 이미 실측 사고 기록이 있다: AI에게 상세페이지
 * 전체(레이아웃+문구+이미지)를 통짜로 맡겼더니, 크레딧이 생기자 그 경로가
 * 되살아나며 우리가 설계한 사진+문구 구조를 통째로 무시했다. 그래서 이
 * 모듈은 **문장만** 다듬는다 — 어떤 사실을 넣을지, 몇 개를 넣을지, 어디에
 * 배치할지는 여전히 코드(buyer-psychology, premium-detail-template)가 정한다.
 * AI는 "이미 정해진 사실을 더 잘 읽히게 다시 쓰는" 역할로 좁혀 놓는다.
 *
 * ★ 왜 새 사실을 추가하면 안 되는가
 *
 * 위탁판매는 실물을 검증할 수 없다. AI가 "매끄럽게" 만들려고 확인 안 된
 * 디테일("고급스러운 마감", "튼튼한 내구성")을 끼워 넣으면 그게 곧
 * 허위표시가 된다. 그래서 프롬프트가 금지하는 것은 딱 하나, 새로운 사실
 * 주장이다. 원문에 없던 형용사·수치·효능이 생기면 실패로 친다.
 *
 * ★ 실패해도 원문을 쓴다
 *
 * API 실패, 타임아웃, 개수 불일치, 검증 실패 — 전부 원문 셀링포인트로
 * 폴백한다. 문장이 안 예뻐지는 것과 상세페이지 생성 자체가 막히는 것은
 * 비교가 안 된다.
 */

import { isCopyClean, sanitizeCopy } from "./buyer-psychology";

export const COPY_POLISH_VERSION = "1.0";

export function copyPolishEnabled(): boolean {
  if (!process.env.OPENAI_API_KEY?.trim()) return false;
  return process.env.JARVIS_COPY_POLISH !== "false";
}

/**
 * 원문에 있던 핵심 숫자·단어가 다듬은 문장에도 살아있는지 확인한다.
 *
 * ★ 왜 이렇게 거칠게 검증하나
 *
 * 문장이 자연스러운지는 코드로 판단할 수 없다. 대신 "사실이 사라지거나
 * 바뀌지 않았는가"는 숫자·핵심 토큰의 존재 여부로 근사할 수 있다. 원문에
 * "12%"가 있었는데 다듬은 문장에 그 숫자가 없으면, 표현을 바꾸다가 사실을
 * 흘렸거나 다른 숫자로 착각했을 가능성이 있다 — 통과시키지 않는다.
 */
/** 테스트 전용 — 검증 로직만 따로 확인한다 */
export function __preservesFactsForTest(original: string, polished: string): boolean {
  return preservesFacts(original, polished);
}

/** 테스트 전용 */
export function __withinLengthBudgetForTest(original: string, polished: string): boolean {
  return withinLengthBudget(original, polished);
}

function preservesFacts(original: string, polished: string): boolean {
  const numbers = original.match(/\d+/g) ?? [];
  for (const n of numbers) {
    if (!polished.includes(n)) return false;
  }
  return true;
}

/** 문장 길이가 원문 대비 비정상적으로 늘어나지 않았는가 — 과도한 부연은 지어낸 내용일 확률이 높다 */
function withinLengthBudget(original: string, polished: string): boolean {
  return polished.length <= original.length * 2.2 && polished.length >= 4;
}

export type PolishResult = {
  points: string[];
  /** 실제로 AI가 다듬었는가 (false면 원문 그대로) */
  polished: boolean;
  reason: string;
};

/**
 * 셀링포인트 문장을 다듬는다. 실패·비활성·검증 미통과 시 원문을 그대로 돌려준다.
 */
export async function polishSellingCopy(points: string[]): Promise<PolishResult> {
  const clean = points.filter((p) => p && p.trim());
  if (!clean.length) return { points: clean, polished: false, reason: "빈 입력" };
  if (!copyPolishEnabled()) {
    return { points: clean, polished: false, reason: "비활성(OPENAI_API_KEY 없음 또는 JARVIS_COPY_POLISH=false)" };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const numbered = clean.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const prompt =
    `아래는 한국 이커머스 상세페이지에 들어갈 셀링포인트 문장이다. 각 문장을 ` +
    `전문 카피라이터가 다듬은 것처럼 더 자연스럽고 읽기 좋게 다시 써라.\n\n` +
    `절대 규칙:\n` +
    `- 문장 개수를 정확히 ${clean.length}개로 유지한다 (순서도 그대로)\n` +
    `- 숫자(퍼센트·가격·수량 등)는 절대 바꾸지 않는다\n` +
    `- 원문에 없는 새로운 사실·효능·수치·형용사를 추가하지 않는다 (예: "고급스러운", "튼튼한", "인기 폭발" 등 원문에 근거 없는 표현 금지)\n` +
    `- "최고", "1위", "100%", "완치", "보장" 같은 과장·최상급 표현을 쓰지 않는다\n` +
    `- 각 문장은 한 줄, 느낌표는 최대 1개\n\n` +
    `원문:\n${numbered}\n\n` +
    `출력은 번호 없이 다듬은 문장만 한 줄씩, 총 ${clean.length}줄로.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.JARVIS_COPY_POLISH_MODEL?.trim() || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { points: clean, polished: false, reason: `API 실패 (HTTP ${res.status})` };

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const lines = raw
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean);

    if (lines.length !== clean.length) {
      return { points: clean, polished: false, reason: `개수 불일치 (원문 ${clean.length} / 응답 ${lines.length})` };
    }

    const verified: string[] = [];
    for (let i = 0; i < clean.length; i++) {
      const original = clean[i];
      const candidate = lines[i];
      if (
        !isCopyClean(candidate) ||
        !preservesFacts(original, candidate) ||
        !withinLengthBudget(original, candidate)
      ) {
        // 이 줄만 실패해도 전체를 원문으로 되돌린다 — 절반만 다듬으면
        // 톤이 섞여 오히려 부자연스럽다.
        return { points: clean, polished: false, reason: `${i + 1}번째 문장이 검증 실패 — 원문 유지` };
      }
      verified.push(sanitizeCopy(candidate).clean);
    }

    return { points: verified, polished: true, reason: `${verified.length}개 문장 다듬음` };
  } catch (e) {
    return {
      points: clean,
      polished: false,
      reason: e instanceof Error ? `실패 — ${e.message}` : "네트워크 오류",
    };
  }
}
