export type AdCardPlatform = "coupang" | "smartstore" | "meta" | "kakao";

export type AdCardSpec = {
  id: string;
  platform: AdCardPlatform;
  label: string;
  width: number;
  height: number;
  purpose: string;
};

export const AD_CARD_SPECS: AdCardSpec[] = [
  {
    id: "coupang_square",
    platform: "coupang",
    label: "쿠팡 광고 정사각",
    width: 1200,
    height: 1200,
    purpose: "쿠팡 검색/상품 광고 썸네일",
  },
  {
    id: "coupang_wide",
    platform: "coupang",
    label: "쿠팡 배너 가로",
    width: 1200,
    height: 628,
    purpose: "쿠팡 배너형 소재",
  },
  {
    id: "naver_square",
    platform: "smartstore",
    label: "네이버 쇼핑검색 정사각",
    width: 1000,
    height: 1000,
    purpose: "스마트스토어·쇼핑검색 광고",
  },
  {
    id: "meta_feed",
    platform: "meta",
    label: "메타 피드",
    width: 1080,
    height: 1080,
    purpose: "인스타/페이스북 피드",
  },
  {
    id: "kakao_biz",
    platform: "kakao",
    label: "카카오 비즈보드",
    width: 1029,
    height: 258,
    purpose: "카카오 비즈보드 이미지",
  },
];
