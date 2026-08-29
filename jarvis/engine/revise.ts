/**
 * 부분 수정 — "이 부분만 고쳐줘"
 *
 * ★ 사장님이 원한 것
 *
 * 검수하다 보면 페이지 전체가 아니라 한 군데가 마음에 안 든다. 그때
 * 그 부분만 짚어서 "이거 고쳐줘"라고 말하면 자비스가 거기만 다시
 * 쓰는 것. 페이지를 통째로 다시 만들면 마음에 들었던 부분까지 바뀐다.
 *
 * ★ 어떻게 만들었는가 — 두 갈래
 *
 *  1. **말만 바꾸면 되는 것**은 프로그램이 직접 한다.
 *     "이 부분 빼줘", "사진 첫 장만 남겨줘" 같은 요청은 뜻이 분명해서
 *     AI를 부를 이유가 없다. AI를 부르면 오히려 느리고, 실패할 수 있고,
 *     결과가 매번 달라진다.
 *
 *  2. **문구를 다시 써야 하는 것**만 AI에게 맡긴다. 이때도 AI가 주는 건
 *     **글자뿐**이다 — HTML은 절대 받지 않는다.
 *
 * ★ AI가 HTML을 만들게 하지 않는 이유
 *
 * 모델이 만든 태그를 그대로 페이지에 넣으면 두 가지가 깨진다. 하나는
 * 레이아웃(오픈마켓 상세는 우리 스타일 규칙 안에서만 제대로 보인다),
 * 다른 하나는 안전(모델 출력이 그대로 마크업이 되면 무엇이든 들어갈 수
 * 있다). 그래서 모델은 문장만 내고, HTML은 언제나 우리 렌더러가 그린다.
 * 결과적으로 고친 페이지는 처음 만든 페이지와 **정확히 같은 규칙**으로
 * 그려진다 — 부분 수정이 레이아웃을 망가뜨릴 수 없다.
 *
 * ★ 고쳐도 지키는 것
 *
 * 셀러 용어(`도매`, `10P`, `사입`)와 없는 사실은 고친 뒤에도 못 들어온다.
 * AI가 "베스트셀러 1위"라고 써주면 그건 거짓말이고 표시광고법 위반이다.
 * 그래서 돌아온 문구도 처음 만들 때와 같은 필터를 통과해야 한다.
 */

import { openAiTextCompletion } from "@/lib/openai-chat";
import { hasSellerJargon } from "./relevance";
import type { PageCopy, SectionKind } from "./detail-page";
import { SECTION_LABELS } from "./detail-page";

export const REVISE_VERSION = "1.0";

export type ReviseResult =
  | { ok: true; copy: PageCopy; note: string }
  | { ok: false; reason: string };

/** 사장님이 쓴 말이 "빼달라"는 뜻인가 */
function meansRemove(request: string): boolean {
  const r = request.replace(/\s/g, "");
  return /빼|지워|삭제|없애|제거|필요없|안보이게/.test(r);
}

/**
 * AI가 돌려준 문구를 고객에게 내보내도 되는지 본다.
 *
 * 통과 못 하면 **버리고 원래 문구를 지킨다.** 못 미더운 문구를 넣느니
 * 안 고쳐진 게 낫다 — 사장님은 화면을 보고 다시 말할 수 있지만, 거짓
 * 문구가 등록되면 되돌릴 수 없다.
 */
export function acceptCopyLine(line: string, maxLen = 120): string | null {
  // 모델은 목록을 낼 때 번호·기호·따옴표를 습관적으로 붙인다. 그대로 두면
  // 고객 화면에 `1. "튼튼합니다"`가 그대로 뜬다.
  const t = line
    .trim()
    .replace(/^["'\-•*\d.)\s]+/, "")
    .replace(/["']+$/, "")
    .trim();
  if (t.length < 2 || t.length > maxLen) return null;
  if (hasSellerJargon(t)) return null;
  // 모델이 태그를 섞어 보내면 통째로 버린다 — 부분적으로 지우면
  // 뜻이 바뀐 문장이 남는다
  if (/[<>]/.test(t)) return null;
  // 근거 없는 최상급·실적 주장 — 아직 하나도 안 팔린 상품이다
  if (/1위|베스트|최고|최저가|정품보장|100%|누적\s*\d|후기\s*\d/.test(t)) return null;
  return t;
}

/**
 * 프로그램이 직접 할 수 있는 수정.
 *
 * 돌려주는 값이 null이면 "이건 문구를 다시 써야 하는 요청"이라는 뜻이다.
 */
export function applyDirectRevision(
  copy: PageCopy,
  section: SectionKind,
  request: string,
): { copy: PageCopy; note: string } | null {
  if (!meansRemove(request)) return null;

  const label = SECTION_LABELS[section];

  switch (section) {
    case "problem":
      return {
        copy: { ...copy, problemHeading: "", problemBody: "" },
        note: `「${label}」 부분을 뺐습니다.`,
      };
    case "solution":
      return {
        copy: { ...copy, sellingPoints: [] },
        note: `「${label}」 부분을 뺐습니다.`,
      };
    case "gallery":
      // 맨 위 사진은 남긴다 — 사진이 하나도 없는 상품 페이지는 안 팔린다
      return {
        copy: { ...copy, images: copy.images.slice(0, 1) },
        note: "추가 사진을 뺐습니다. 맨 위 사진은 남겨뒀습니다.",
      };
    case "spec":
      return { ...{ copy: { ...copy, specs: [] } }, note: `「${label}」 표를 뺐습니다.` };
    case "hero":
    case "guarantee":
      // 이 둘은 뺄 수 없다. 상품명 없는 상품, 배송·반품 안내 없는 상품은
      // 등록 자체가 안 되거나 전자상거래법상 필수 표기가 빠진 것이 된다.
      return null;
  }
}

/** 뺄 수 없는 섹션에 "빼줘"가 오면 왜 안 되는지 말해준다 */
function refuseRemoval(section: SectionKind): string | null {
  if (section === "hero") {
    return "맨 위 상품명·소개는 뺄 수 없습니다. 대신 어떻게 바꿀지 말씀해 주시면 다시 쓰겠습니다.";
  }
  if (section === "guarantee") {
    return "배송·교환·반품 안내는 전자상거래법상 필수 표기라 뺄 수 없습니다. 문구를 바꾸는 건 가능합니다.";
  }
  return null;
}

/** 그 섹션에서 AI가 고칠 수 있는 글자들 */
function currentText(copy: PageCopy, section: SectionKind): string[] {
  switch (section) {
    case "hero":
      return [copy.title, copy.lead];
    case "problem":
      return [copy.problemHeading, copy.problemBody];
    case "solution":
      return [copy.solutionHeading, ...copy.sellingPoints];
    case "guarantee":
      return copy.guarantee;
    case "spec":
      return copy.specs.map(([k, v]) => `${k}: ${v}`);
    case "gallery":
      return [];
  }
}

function buildPrompt(
  copy: PageCopy,
  section: SectionKind,
  request: string,
): { system: string; user: string } {
  const system = [
    "당신은 한국 온라인 쇼핑몰 상세페이지의 문구를 고치는 사람입니다.",
    "규칙:",
    "- 요청받은 부분의 문구만 고칩니다. 다른 부분은 건드리지 않습니다.",
    "- 확인되지 않은 사실을 쓰지 않습니다. 후기 수, 판매량, 순위, 인증, 원산지, 소재를 지어내지 마세요.",
    "- '1위', '베스트', '최고', '100%' 같은 근거 없는 표현을 쓰지 않습니다.",
    "- 도매·사입·10P 같은 판매자 내부 용어를 쓰지 않습니다. 이 상품은 낱개로 팝니다.",
    "- HTML 태그를 쓰지 않습니다. 문장만 씁니다.",
    "- 한 줄에 하나씩, 원래 줄 수와 같은 수의 줄을 출력합니다. 번호나 기호를 붙이지 않습니다.",
  ].join("\n");

  const lines = currentText(copy, section);
  const user = [
    `상품명: ${copy.title}`,
    `고칠 부분: ${SECTION_LABELS[section]}`,
    "",
    "지금 문구 (이 줄 수 그대로 돌려주세요):",
    ...lines.map((l) => l || "(비어 있음)"),
    "",
    `사장님 요청: ${request}`,
  ].join("\n");

  return { system, user };
}

/** AI가 돌려준 줄들을 원래 자리에 넣는다 — 받아들여진 줄만 */
function applyLines(
  copy: PageCopy,
  section: SectionKind,
  lines: string[],
): { copy: PageCopy; changed: number } {
  let changed = 0;
  const take = (i: number, fallback: string, maxLen?: number): string => {
    const v = lines[i] != null ? acceptCopyLine(lines[i], maxLen) : null;
    if (v && v !== fallback) {
      changed++;
      return v;
    }
    return fallback;
  };

  switch (section) {
    case "hero": {
      const title = take(0, copy.title, 60);
      const lead = take(1, copy.lead, 80);
      return { copy: { ...copy, title, lead }, changed };
    }
    case "problem": {
      const problemHeading = take(0, copy.problemHeading, 60);
      const problemBody = take(1, copy.problemBody, 200);
      return { copy: { ...copy, problemHeading, problemBody }, changed };
    }
    case "solution": {
      const solutionHeading = take(0, copy.solutionHeading, 60);
      const points = copy.sellingPoints.map((p, i) => take(i + 1, p, 80));
      return { copy: { ...copy, solutionHeading, sellingPoints: points }, changed };
    }
    case "guarantee": {
      const guarantee = copy.guarantee.map((g, i) => take(i, g, 160));
      return { copy: { ...copy, guarantee }, changed };
    }
    case "spec": {
      // 표는 확인된 사실만 담는 자리다. AI가 행을 새로 만들면 없는 사양이
      // 생기므로, **있는 행의 값만** 바꾸고 행 수는 절대 안 늘린다.
      const specs = copy.specs.map(([k, v], i) => {
        const line = lines[i] != null ? acceptCopyLine(lines[i], 120) : null;
        if (!line) return [k, v] as [string, string];
        const idx = line.indexOf(":");
        const nv = (idx >= 0 ? line.slice(idx + 1) : line).trim();
        if (!nv || nv === v) return [k, v] as [string, string];
        changed++;
        return [k, nv] as [string, string];
      });
      return { copy: { ...copy, specs }, changed };
    }
    case "gallery":
      return { copy, changed: 0 };
  }
}

/**
 * "이 부분 고쳐줘"를 실제로 처리한다.
 *
 * 실패해도 **원래 페이지는 그대로 둔다.** 고치려다 페이지가 망가지면
 * 사장님은 승인도 못 하고 되돌리지도 못한다.
 */
export async function reviseSection(params: {
  copy: PageCopy;
  section: SectionKind;
  request: string;
}): Promise<ReviseResult> {
  const request = params.request.trim();
  if (!request) return { ok: false, reason: "어떻게 고칠지 말씀해 주세요." };
  if (request.length > 300) {
    return { ok: false, reason: "요청이 너무 깁니다. 한두 문장으로 말씀해 주세요." };
  }

  // 1. 프로그램이 할 수 있으면 AI를 안 부른다
  const direct = applyDirectRevision(params.copy, params.section, request);
  if (direct) return { ok: true, copy: direct.copy, note: direct.note };

  if (meansRemove(request)) {
    const why = refuseRemoval(params.section);
    if (why) return { ok: false, reason: why };
  }

  if (params.section === "gallery") {
    // 사진은 공급처가 올린 것만 쓴다. 문구 수정으로 사진을 만들어낼 수 없고,
    // 만들어내면 받은 물건과 화면이 달라져 반품 사유가 된다.
    return {
      ok: false,
      reason:
        "사진은 공급처가 올린 실물만 씁니다. 사진을 만들어내면 받으신 물건과 화면이 달라집니다. 「사진 빼줘」는 가능합니다.",
    };
  }

  // 2. 문구를 다시 써야 하는 요청
  const { system, user } = buildPrompt(params.copy, params.section, request);

  let raw: string;
  try {
    raw = await openAiTextCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      timeoutMs: 20_000,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "OPENAI_API_KEY_MISSING") {
      return {
        ok: false,
        reason:
          "문구를 다시 쓰려면 OPENAI_API_KEY가 필요합니다. 연동 설정에 넣어주시면 바로 됩니다. (「이 부분 빼줘」는 지금도 됩니다.)",
      };
    }
    return { ok: false, reason: "문구를 고치지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const { copy, changed } = applyLines(params.copy, params.section, lines);

  if (changed === 0) {
    return {
      ok: false,
      reason:
        "고친 문구가 기준을 통과하지 못해 원래대로 뒀습니다. (없는 사실·판매자 용어·과장 표현은 넣지 않습니다) 다르게 말씀해 주시면 다시 해보겠습니다.",
    };
  }

  return {
    ok: true,
    copy,
    note: `「${SECTION_LABELS[params.section]}」 문구 ${changed}줄을 고쳤습니다.`,
  };
}
