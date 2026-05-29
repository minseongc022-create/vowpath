import { IS_BETA } from "./beta";

export const SITE = {
  name: "Vowpath",
  tagline: "HVAC shop 야간·주말 콜 → Jobber 예약까지",
  url: "https://vowpath.com",
  contactEmail: "minseongc022@gmail.com",
  supportEmail: "minseongc022@gmail.com",
  monthlyPrice: "$199",
  flexBasePrice: "$49",
  flexPerBooking: "$18",
} as const;

export type PlanId = "unlimited" | "flex";

export const ROUTES = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  signup: "/signup",
  getStarted: "/get-started",
  onboarding: "/onboarding",
  settings: "/settings",
  dashboard: "/dashboard",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const FOOTER_LINKS = [
  { label: "개인정보처리방침", href: ROUTES.privacy },
  { label: "이용약관", href: ROUTES.terms },
  { label: "문의", href: `mailto:${SITE.contactEmail}` },
] as const;

export const NAV_LINKS = [
  { label: "제품", href: "/#differentiators" },
  { label: "작동 방식", href: "/#how-it-works" },
  { label: "가격", href: "/#pricing" },
  { label: "시작하기", href: ROUTES.getStarted },
] as const;

export const SECTION_LABELS = {
  process: "프로세스",
  features: "기능",
  signup: "시작 방법",
} as const;

export const CHECKOUT_CTA = IS_BETA ? "무료로 시작하기" : "결제하고 시작하기";
export const BETA_SIGNUP_CTA = "무료로 시작하기";
