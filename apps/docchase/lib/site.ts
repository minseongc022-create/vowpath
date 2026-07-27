export const SITE = {
  name: "수임체크",
  nameEn: "SuimCheck",
  tagline: "수임처 앱 없이, 마감 자료를 끝까지 받아냅니다",
  url: "https://suimcheck.kr",
  supportEmail: "hello@suimcheck.kr",
} as const;

/** @deprecated use PLANS from lib/plans — kept for any leftover imports */
export { PLANS as PRICING } from "./plans";
