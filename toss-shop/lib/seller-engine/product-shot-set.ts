/**
 * 상품 컷 세트 — 한 장의 도매 원본에서 "다른 스튜디오에서 찍은 듯한" 여러 컷을 만든다
 *
 * ★ 목표
 * 후커블·드랩의 상세페이지가 좋아 보이는 이유는 카피가 아니라 **컷 수와 다양성**이다.
 * 히어로컷 → 디테일컷 → 사용 맥락컷 → 크기 가늠컷으로 이어지면, 같은 상품이라도
 * "제대로 촬영한 브랜드"처럼 보인다. 도매 원본 1장만 붙이면 그 격차가 그대로 남는다.
 *
 * ★ 각도에 대한 정직한 한계 — 이게 이 모듈의 가장 중요한 설계 판단이다.
 *
 * "완전히 다른 각도에서 찍은 것처럼"을 문자 그대로 구현하려면, 원본에 **찍히지
 * 않은 면**(뒷면·바닥·반대 측면)을 모델이 만들어내야 한다. 그건 필연적으로
 * 없는 디테일을 지어내는 것이다:
 *   · 뒷면에 실제로 없는 무늬·로고가 생긴다
 *   · 라벨 글자가 뭉개지거나 다른 문장으로 바뀐다
 *   · 버튼·포트·마감 같은 구조가 실물과 달라진다
 * 그 이미지를 보고 산 고객은 다른 물건을 받는다 → 반품·분쟁·페널티, 그리고
 * 전자상거래법상 허위·과장 표시에 해당한다. 위탁판매는 실물을 셀러가 손에
 * 쥐어보지도 않으므로 검증할 방법조차 없다.
 *
 * 그래서 이 모듈은 각도를 이렇게 다룬다:
 *   ✅ 허용 — **원본에 보이는 면을 유지**한 채 카메라 거리·높이·구도·조명·배경을
 *      바꾼다. 클로즈업, 와이드, 약간 위/아래에서 본 시점, 다른 배경.
 *      실제로 "다른 스튜디오에서 다시 찍은 것"처럼 보이는 대부분의 효과는
 *      각도가 아니라 **조명·배경·구도**에서 나온다.
 *   ❌ 금지 — 뒷면·반대편·180도 회전. 지어내는 순간 상품이 달라진다.
 *
 * 이 경계는 프롬프트에 매 컷마다 명시적으로 박는다. 모델이 지어내지 않도록
 * "보이지 않는 면은 만들지 말고, 보이는 면만 다시 조명하라"고 지시한다.
 *
 * ★ 비용 통제
 * 컷 수는 env로 조절한다. 하루 5개 SKU × 4컷 = 20장이 기본 상한선이다.
 * 실패한 컷은 조용히 건너뛰고, 전부 실패해도 원본으로 폴백해 등록은 계속된다.
 */

import { regenerateProductBackground, aiImagesEnabled, type ImageStyle } from "./ai-image-studio";

export const SHOT_SET_VERSION = "1.0";

/** 컷 종류 — 상세페이지에서 맡는 역할이 각각 다르다 */
export type ShotKind =
  /** 히어로 — 첫인상. 프리미엄 스튜디오 조명, 상품 단독 */
  | "hero"
  /** 디테일 — 재질·마감 클로즈업 (같은 면, 더 가까이) */
  | "detail"
  /** 사용 맥락 — 실제 생활공간에 놓인 모습 */
  | "lifestyle"
  /** 크기 가늠 — 일상 사물과 함께 두어 스케일 전달 */
  | "scale";

export type ProductShot = {
  kind: ShotKind;
  url: string;
  /** 사람이 읽는 컷 설명 — 상세페이지 캡션·alt에 쓴다 */
  caption: string;
};

export type ShotSetResult = {
  engineVersion: string;
  shots: ProductShot[];
  /** 원본 이미지 (항상 첫 컷으로 유지 — 실물 확인용) */
  originalUrl?: string;
  /** 생성 실패·비활성으로 건너뛴 컷 */
  skipped: Array<{ kind: ShotKind; reason: string }>;
};

/**
 * 컷별 촬영 지시.
 *
 * `angleHint`는 전부 "보이는 면 유지" 범위다. 뒷면·반대편을 요구하는 지시는
 * 의도적으로 넣지 않았다 — 위 주석의 이유 때문이다.
 */
const SHOT_DIRECTIONS: Record<ShotKind, { caption: string; angleHint: string; style: ImageStyle }> = {
  hero: {
    caption: "정면 스튜디오 컷",
    angleHint:
      "Keep the exact same viewing side of the product as the original. " +
      "Re-light it as a premium studio hero shot: large softbox key light from upper left, " +
      "subtle rim light, gentle floor reflection, generous negative space around the product.",
    style: "studio",
  },
  detail: {
    caption: "디테일 클로즈업",
    angleHint:
      "Keep the exact same viewing side of the product as the original — do not rotate it. " +
      "Move the camera closer for a tight macro-style crop that shows surface texture and finish. " +
      "Shallow depth of field, crisp focus on the material, soft diffused light.",
    style: "studio",
  },
  lifestyle: {
    caption: "실사용 맥락 컷",
    angleHint:
      "Keep the exact same viewing side of the product as the original. " +
      "Place it naturally in a real living space with warm natural window light, " +
      "slightly wider framing so the surrounding context is visible.",
    style: "lifestyle",
  },
  scale: {
    caption: "크기 가늠 컷",
    angleHint:
      "Keep the exact same viewing side of the product as the original. " +
      "Frame it on a plain surface next to ordinary everyday objects so the viewer can judge its size. " +
      "Even, neutral lighting; the product remains the clear subject.",
    style: "studio",
  },
};

/** 기본 컷 구성 — env로 조절 (비용 통제) */
function enabledShotKinds(): ShotKind[] {
  const raw = process.env.JARVIS_SHOT_KINDS?.trim();
  if (raw) {
    const wanted = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is ShotKind => s in SHOT_DIRECTIONS);
    if (wanted.length) return wanted;
  }
  return ["hero", "detail", "lifestyle"];
}

function maxShots(): number {
  const n = Number.parseInt(process.env.JARVIS_MAX_SHOTS_PER_PRODUCT?.trim() ?? "", 10);
  if (Number.isFinite(n) && n >= 1) return Math.min(n, 6);
  return 3;
}

/**
 * 원본 상품 사진 1장 → 여러 컷 세트.
 *
 * 실패한 컷은 skipped에 이유를 남기고 건너뛴다. 전부 실패해도 예외를 던지지
 * 않는다 — 이미지 때문에 상품 등록이 막히면 안 되기 때문(ai-image-studio 원칙 1).
 */
export async function buildProductShotSet(input: {
  imageUrl?: string;
  category: string;
  productLabel: string;
}): Promise<ShotSetResult> {
  const base: ShotSetResult = {
    engineVersion: SHOT_SET_VERSION,
    shots: [],
    originalUrl: input.imageUrl,
    skipped: [],
  };

  if (!input.imageUrl) {
    base.skipped.push({ kind: "hero", reason: "원본 이미지 없음" });
    return base;
  }
  if (!aiImagesEnabled()) {
    base.skipped.push({ kind: "hero", reason: "AI 이미지 비활성 (OPENAI_API_KEY 또는 JARVIS_AI_IMAGES)" });
    return base;
  }

  const kinds = enabledShotKinds().slice(0, maxShots());

  for (const kind of kinds) {
    const dir = SHOT_DIRECTIONS[kind];
    const generated = await regenerateProductBackground({
      imageUrl: input.imageUrl,
      category: input.category,
      productLabel: input.productLabel,
      style: dir.style,
      // 컷별 촬영 지시 — 형태 보존 제약은 regenerateProductBackground가 공통으로 건다
      directive: dir.angleHint,
    });

    if (generated) {
      base.shots.push({ kind, url: generated.url, caption: dir.caption });
    } else {
      base.skipped.push({ kind, reason: "이미지 생성 실패 — 원본으로 폴백" });
    }
  }

  return base;
}
