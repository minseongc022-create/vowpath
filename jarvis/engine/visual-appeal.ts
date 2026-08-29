/**
 * 상품 사진이 실제로 팔릴 비주얼인가 — AI가 눈으로 본다
 *
 * ★ 사장님 지적
 *
 * "아무도 안 살거같은 비주얼의 상품". 지금까지 판단(engine/judge.ts)은
 * 사진이 **몇 장** 있는지만 봤다. 몇 장이든 사진 자체가 조악하면(빛 반사,
 * 낡은 패키지, 손으로 찍은 저해상도 사진, 텍스트가 덕지덕지 붙은 상세용
 * 배너 이미지 등) 그 상품은 안 팔린다. 개수가 아니라 **품질**을 봐야
 * 한다 — 그건 텍스트로는 판단할 수 없고, 실제로 사진을 봐야 한다.
 *
 * ★ 지어내지 않는다
 *
 * "예쁘다"는 주관적이지만 "이 상품을 사고 싶게 만드는가"는 몇 가지
 * 객관적 신호로 물을 수 있다: 해상도가 낮은가, 조명이 나쁜가, 배경이
 * 지저분한가, 상품이 아니라 박스만 찍었는가, 텍스트/워터마크가 상품을
 * 가리는가. 모델에게 이 신호들을 각각 물어 점수를 매기게 하고, 그
 * 근거를 그대로 남긴다 — "몇 점"만 나오면 사장님이 왜 그 점수인지
 * 확인할 수 없다.
 *
 * ★ 못 판단하면 벌하지 않는다
 *
 * AI 키가 없거나 호출이 실패하면 중립값(0.5)으로 둔다. 사진 품질을
 * 몰라서 후보가 통째로 밀려나면 안 된다 — 다른 신호(순이익·마진 등)로도
 * 충분히 판단할 수 있어야 한다.
 */

import { openAiVisionCompletion } from "@/lib/openai-chat";

export const VISUAL_APPEAL_VERSION = "1.0";

export type VisualAppeal = {
  /** 0~1 — 높을수록 "이 사진을 보고 사고 싶다" */
  score: number;
  /** 판단 근거 한 줄 — 검수 화면에 그대로 보여준다 */
  reason: string;
  /** 실제로 AI가 사진을 봤는가 (false면 score는 중립값) */
  judged: boolean;
};

const NEUTRAL: VisualAppeal = { score: 0.5, reason: "사진 품질 미판단", judged: false };

/** 판단당 최대 장수 — 너무 많이 보내면 느려지고 비용만 커진다 */
const MAX_IMAGES_FOR_JUDGE = 4;

type Cached = { at: number; value: VisualAppeal };
const cache = new Map<string, Cached>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

function parseResponse(raw: string): VisualAppeal | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : raw) as { score?: unknown; reason?: unknown };
    const score = typeof obj.score === "number" ? obj.score : Number(obj.score);
    if (!Number.isFinite(score)) return null;
    const reason = typeof obj.reason === "string" && obj.reason.trim() ? obj.reason.trim() : "판단됨";
    return { score: Math.max(0, Math.min(1, score)), reason: reason.slice(0, 120), judged: true };
  } catch {
    return null;
  }
}

/**
 * 사진을 보고 "이 상품을 이 사진으로 팔면 될까"를 판단한다.
 *
 * cacheKey는 공급처 상품번호 — 같은 상품을 사이클마다 다시 보내 비용을
 * 또 쓰지 않는다.
 */
export async function judgeVisualAppeal(
  cacheKey: string,
  imageUrls: string[],
  opts?: { timeoutMs?: number },
): Promise<VisualAppeal> {
  const images = imageUrls.filter(Boolean).slice(0, MAX_IMAGES_FOR_JUDGE);
  if (!images.length) return { score: 0, reason: "사진이 없음", judged: true };

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  if (!process.env.OPENAI_API_KEY) return NEUTRAL;

  try {
    const raw = await openAiVisionCompletion({
      timeoutMs: opts?.timeoutMs,
      messages: [
        {
          role: "system",
          content:
            "당신은 이커머스 상품 사진을 심사하는 MD입니다. 이 사진들만 보고 고객이 " +
            "구매 페이지에서 이 사진을 봤을 때 사고 싶어질지 판단하세요. " +
            "다음을 특히 봅니다: 해상도·초점이 선명한가, 조명이 자연스러운가, " +
            "배경이 정돈됐는가, 상품 자체가 화면에 크고 명확하게 나오는가, " +
            "워터마크·과도한 텍스트가 상품을 가리지 않는가. " +
            'JSON 하나만 답하세요: {"score": 0.0~1.0, "reason": "한국어 한 줄"}',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "이 사진들로 등록해도 될까요?" },
            ...images.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "low" as const },
            })),
          ],
        },
      ],
    });
    const parsed = parseResponse(raw);
    if (!parsed) return NEUTRAL;

    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(cacheKey, { at: Date.now(), value: parsed });
    return parsed;
  } catch {
    return NEUTRAL;
  }
}

/** 테스트·핫리로드용 */
export function clearVisualAppealCache(): void {
  cache.clear();
}

/**
 * 후보 여러 개를 한꺼번에 판단한다 — 시간과 동시 호출 수를 지킨다.
 *
 * ★ 왜 여기서 시간을 재는가
 *
 * 자동 크론은 25초 안에 응답해야 한다(cron-job.org 무료 플랜이 그 이상은
 * 타임아웃으로 처리한다 — 이 프로젝트가 실제로 겪은 사고다). 사진 판단은
 * 후보당 몇 초씩 걸릴 수 있어서, 후보 10여 개를 순서대로 다 보면 그
 * 시간을 넘긴다. 그래서 남은 시간을 미리 재서 예산을 잡고, 예산을 넘기면
 * **남은 후보는 판단을 건너뛴다**(중립값으로 남는다) — 시간을 넘겨 크론
 * 자체가 실패하는 것보다, 일부만 판단하고 정상 응답하는 게 낫다.
 */
export async function judgeVisualAppealBatch(
  items: Array<{ cacheKey: string; imageUrls: string[] }>,
  opts?: { deadlineAt?: number; concurrency?: number },
): Promise<Map<string, VisualAppeal>> {
  const out = new Map<string, VisualAppeal>();
  const concurrency = Math.max(1, opts?.concurrency ?? 3);

  for (let i = 0; i < items.length; i += concurrency) {
    if (opts?.deadlineAt && Date.now() > opts.deadlineAt) break;

    const batch = items.slice(i, i + concurrency);
    const remaining = opts?.deadlineAt ? opts.deadlineAt - Date.now() : 15_000;
    if (remaining < 2000) break; // 한 판단이라도 제대로 끝낼 시간이 없다

    const results = await Promise.all(
      batch.map((item) =>
        judgeVisualAppeal(item.cacheKey, item.imageUrls, {
          timeoutMs: Math.min(12_000, Math.max(3000, remaining)),
        }),
      ),
    );
    batch.forEach((item, idx) => out.set(item.cacheKey, results[idx]));
  }

  return out;
}
