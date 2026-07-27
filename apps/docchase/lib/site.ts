export const SITE = {
  name: "수임체크",
  nameEn: "SuimCheck",
  tagline: "알림톡 → 원탭 회신 → 남은 곳만 전화. 마감 독촉 OS",
  url: "https://suimcheck.kr",
  supportEmail: "hello@suimcheck.kr",
} as const;

/** @deprecated use PLANS from lib/plans — kept for any leftover imports */
export { PLANS as PRICING } from "./plans";
