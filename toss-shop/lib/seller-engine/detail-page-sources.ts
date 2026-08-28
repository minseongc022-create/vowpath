/**
 * 상세페이지 공급원 레지스트리 — 무엇이 실제로 연결돼 있는가
 *
 * ★ 왜 이 파일이 생겼는가 — 있지도 않은 API를 부르고 있었다
 *
 * detail-page-providers.ts는 후커블·드랩아트·셀러비서를 이렇게 불렀다:
 *
 *     POST {DRAPH_API_URL}
 *     Authorization: Bearer {DRAPH_API_KEY}
 *     body: { title, keyword, price, sellingPoints, images, format: "html" }
 *     → 기대 응답: { html }
 *
 * 세 서비스가 **같은 요청·응답 스펙을 쓴다고 가정한** 코드다. 그런 근거는
 * 어디에도 없었다. 확인해 보면:
 *
 *  · 후커블(펄크럼테크놀로지스) — 공개 개발자 API가 없다. 스타터/그로스/프로
 *    웹 요금제만 있고, "API 연동 솔루션"은 파트너십 보도자료에 **향후 계획**으로
 *    언급된 단계다.
 *  · 드랩아트(드랩) — AI 상세페이지 기능과 카페24 스토어 앱은 있으나, 공개
 *    개발자 API 문서가 없다. 산출물을 복사해 쿠팡·스마트스토어에 붙이는 흐름이다.
 *  · 셀러비서 — 공개 API 스펙을 확인하지 못했다.
 *
 * 게다가 호출부가 `catch { return null }`로 오류를 통째로 삼킨다. 그래서 이
 * 경로는 **영원히 조용히 실패하고** 다음 폴백으로 넘어간다. 키를 넣어도
 * 동작하지 않는데, 동작하지 않는다는 사실조차 남지 않는다.
 *
 * 이건 이 저장소가 wholesale/adapters/registry.ts에서 이미 금지한 실수와 같은
 * 종류다: "플랫폼이 오픈API를 제공하는 것은 확인했으나 스펙이 반영되지 않았다면
 * 추측으로 채우지 않는다." 그 원칙을 상세페이지 쪽에도 적용한다.
 *
 * ★ 그래서 무엇을 할 수 있는가
 *
 * 세 가지 경로가 실제로 있다. 순서대로 시도한다:
 *
 *  1. **반입(manual_import)** — 사람이 후커블·드랩아트 웹에서 상세페이지를
 *     만들고 그 결과(HTML 또는 이미지)를 자비스에 넘긴다. 자비스가 검수·등록·
 *     이후 전 과정을 맡는다. 지금 당장 되는 유일한 "타사 고품질" 경로다.
 *     사람 손이 5분 들어가지만, 없는 API를 기다리는 것보다 빠르다.
 *  2. **계약된 API(needs_spec → live)** — 실제로 API 계약을 맺으면 그때
 *     그 업체의 진짜 스펙으로 어댑터를 채운다. 그 전까지는 `needs_spec`으로
 *     남겨두고 호출하지 않는다.
 *  3. **자체 생성** — OpenAI 프리미엄 → 로컬 템플릿. 이미 동작하는 경로다.
 */

export const DETAIL_SOURCES_VERSION = "1.0";

/** 이 공급원이 실제로 쓸 수 있는 상태인가 */
export type DetailSourceStatus =
  /** 지금 호출하면 동작한다 */
  | "live"
  /** 스펙은 구현됐으나 키가 없다 */
  | "needs_key"
  /**
   * 이 업체의 공개 API 스펙을 확보하지 못했다. 추측으로 채우지 않는다.
   * 계약·문서를 받으면 그때 어댑터를 구현한다.
   */
  | "needs_spec";

export type DetailSourceInfo = {
  id: string;
  label: string;
  status: DetailSourceStatus;
  /** 건당 예상 비용 (원) */
  costKrw: number;
  /** 필요한 환경변수 */
  envKeys: string[];
  /** 사람이 읽는 현재 상태 설명 — 설정 화면·헬스체크에 그대로 노출한다 */
  note: string;
};

/**
 * 외부 SaaS 어댑터.
 *
 * ⚠️ 전부 `needs_spec`이다. 공개 API 스펙을 확인하지 못했기 때문이고,
 * 확인하지 못한 것을 추측해서 채우면 키를 넣어도 조용히 실패한다.
 *
 * 이 상태를 벗어나려면 실제로 필요한 것:
 *   1) 해당 업체와 API 이용 계약 (대부분 B2B 문의를 거쳐야 한다)
 *   2) 엔드포인트·인증 방식·요청/응답 스키마 문서
 *   3) 그 문서대로 구현한 어댑터 + 실호출 검증
 * 이 셋이 갖춰지기 전에는 status를 live로 올리지 않는다.
 */
export function externalDetailSources(): DetailSourceInfo[] {
  return [
    {
      id: "hookable_api",
      label: "후커블(Hookable)",
      status: "needs_spec",
      costKrw: 990,
      envKeys: ["HOOKABLE_API_URL", "HOOKABLE_API_KEY"],
      note:
        "공개 개발자 API 미확인 — 웹 요금제(스타터/그로스/프로)만 제공되며 " +
        "API 연동은 파트너십 발표상 향후 계획 단계. 웹에서 만든 결과를 " +
        "반입(manual_import)하는 경로를 쓸 것.",
    },
    {
      id: "draph",
      label: "드랩아트(Draph Art)",
      status: "needs_spec",
      costKrw: 800,
      envKeys: ["DRAPH_API_URL", "DRAPH_API_KEY"],
      note:
        "AI 상세페이지 기능·카페24 앱은 있으나 공개 개발자 API 문서 미확인. " +
        "산출물을 복사해 마켓에 붙이는 흐름 — 반입 경로를 쓸 것.",
    },
    {
      id: "sellerbiseo",
      label: "셀러비서",
      status: "needs_spec",
      costKrw: 850,
      envKeys: ["SELLERBISEO_API_URL", "SELLERBISEO_API_KEY"],
      note: "공개 API 스펙 미확인.",
    },
  ];
}

/**
 * 반입 경로가 준비됐는가.
 *
 * 사람이 외부 툴에서 만든 상세페이지를 자비스에 넘기는 경로다. 별도 키가
 * 필요 없으므로 항상 사용 가능하다 — 다만 실제로 쓰려면 사람이 HTML이나
 * 이미지를 실제로 넣어야 한다.
 */
export function manualImportSource(): DetailSourceInfo {
  return {
    id: "manual_import",
    label: "외부 툴 반입 (후커블·드랩아트 등)",
    status: "live",
    costKrw: 0,
    envKeys: [],
    note:
      "사람이 외부 툴에서 만든 상세페이지 HTML/이미지를 자비스가 받아 " +
      "검수·등록한다. 외부 API 없이 지금 바로 되는 고품질 경로.",
  };
}

/**
 * 지금 이 시스템이 상세페이지를 만들 수 있는 경로 전체.
 * 설정 화면·헬스체크가 이 목록을 그대로 보여준다.
 */
export function listDetailSources(): DetailSourceInfo[] {
  const sources: DetailSourceInfo[] = [manualImportSource()];

  sources.push(...externalDetailSources());

  sources.push({
    id: "openai_premium",
    label: "자체 생성 (OpenAI)",
    status: process.env.OPENAI_API_KEY?.trim() ? "live" : "needs_key",
    costKrw: 150,
    envKeys: ["OPENAI_API_KEY"],
    note: process.env.OPENAI_API_KEY?.trim()
      ? "OpenAI로 상세페이지 HTML 생성 — 외부 SaaS 없이 동작"
      : "OPENAI_API_KEY 미설정",
  });

  sources.push({
    id: "hookable_local",
    label: "로컬 템플릿",
    status: "live",
    costKrw: 0,
    envKeys: [],
    note: "최종 폴백 — 항상 결과를 낸다",
  });

  return sources;
}

/**
 * 왜 외부 SaaS가 안 붙는지 사람에게 설명한다.
 *
 * 설정 화면에서 "후커블 키를 넣었는데 왜 안 되지"를 묻기 전에 답이 보여야 한다.
 */
export function externalSourceBlockedNote(): string | null {
  const blocked = externalDetailSources().filter((s) => s.status === "needs_spec");
  if (blocked.length === 0) return null;
  return (
    `외부 상세페이지 SaaS ${blocked.length}곳(${blocked.map((s) => s.label).join(", ")})은 ` +
    `공개 API 스펙이 확인되지 않아 연동돼 있지 않습니다. 키를 넣어도 호출하지 않습니다 — ` +
    `추측한 스펙으로 부르면 조용히 실패하기 때문입니다. ` +
    `지금 쓸 수 있는 고품질 경로는 「외부 툴 반입」입니다: 후커블·드랩아트 웹에서 만든 ` +
    `상세페이지를 자비스에 넘기면 검수·등록부터 이후 전 과정을 자비스가 맡습니다.`
  );
}
