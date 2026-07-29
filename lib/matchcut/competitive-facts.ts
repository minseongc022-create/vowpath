/**
 * Competitive landscape notes (fact-checked 2026-07 sources).
 * Not marketing claims — used for product decisions.
 */
export const COMPETITIVE_FACTS = {
  asOf: "2026-07",
  koreanDetailAiCrowded: true,
  players: [
    {
      name: "크리에이지 (Creazy)",
      fact: "상품 정보+사진 업로드 → 기획·디자인 상세페이지. 도매/외국어 상세는 ‘캡처 이미지를 수동 업로드’해 텍스트만 참고. 1688 URL 자동 스캔·SKU 매칭은 공식 기능으로 문서화되지 않음.",
      sources: ["creazy.app/ko/tutorial/features/product-info", "creazy.app/ko"],
    },
    {
      name: "셀러비서",
      fact: "사진 업로드 → 쿠팡/스마트스토어 상세. URL 소싱 매칭 없음.",
      sources: ["sellerbiseo.com"],
    },
    {
      name: "드랩아트",
      fact: "사진 1장 → 상세/썸네일/모델컷. 일반 상세 AI. URL SKU 매칭 없음.",
      sources: ["draph.art"],
    },
    {
      name: "DetailMaker",
      fact: "사진+정보 → JPG 상세. 크레딧제. URL 매칭 없음.",
      sources: ["detailmaker.kr"],
    },
    {
      name: "PagePilot",
      fact: "AliExpress/Amazon URL → Shopify 페이지. 한국 마켓·실사진 SKU 매칭은 아님.",
      sources: ["pagepilot.ai"],
    },
  ],
  matchCutGap: {
    uniqueClaim:
      "실사진 1장 + 1688/타오바오 URL → 갤러리/SKU 자동 스캔 → 같은 옵션 매칭 → 새 각도 컷 → 쿠팡/스마트스토어 규격 ZIP",
    verifiedGapVsKoreanTools:
      "공개 문서 기준, 한국 상세 AI들은 ‘사진 업로드 기반 디자인’이 중심. Creazy는 외국어 상세를 캡처로 수동 넣는 워크플로를 안내함(URL 자동 매칭 아님).",
    notEmptyMarket:
      "상세페이지 AI 자체는 이미 경쟁이 치열함. ‘빈 시장’이 아님.",
    risk: "Creazy/드랩이 URL 임포트·비전 매칭을 붙이면 격차 축소. 스크래핑 차단·이미지 품질이 실사용 병목.",
  },
} as const;
