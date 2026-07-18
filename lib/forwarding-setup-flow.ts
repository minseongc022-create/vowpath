import {
  DIALPAD_ADMIN_MAIN_LINE_URL,
  DIALPAD_FORWARDING_URL,
  getCarrierQuickActions,
  GOOGLE_VOICE_SETTINGS_URL,
  GRASSHOPPER_LOGIN_URL,
  RINGCENTRAL_ADMIN_URL,
  VERIZON_CALL_FORWARDING_WEB,
  XFINITY_FORWARDING_FAQ,
} from "./forwarding-carrier-codes";
import { isDirectEffiroadLineProvider, type ForwardingProviderId } from "./forwarding-guides-en";
import { runtimeUiLocale, type UiLocale } from "./locale";

export type ForwardingSetupAction = {
  id: string;
  order: number;
  label: string;
  description: string;
  tapHref?: string;
  tapLabel?: string;
  copyText?: string;
  deactivateHref?: string;
  deactivateLabel?: string;
  externalHref?: string;
  externalLabel?: string;
};

export function getOrderedSetupActions(
  provider: ForwardingProviderId,
  effiroadE164: string,
  locale?: UiLocale,
): ForwardingSetupAction[] {
  const ko = (locale ?? runtimeUiLocale()) === "ko";
  const dialStar = ko ? "이 휴대폰에서 *71 통화" : "Dial *71 on this phone";
  const dialPhone = ko ? "이 휴대폰에서 코드 통화" : "Dial on this phone";
  const turnOff73 = ko ? "끄기 (*73)" : "Turn off (*73)";
  const turnOff = ko ? "끄기" : "Turn off";

  if (isDirectEffiroadLineProvider(provider)) {
    return [
      {
        id: "main-copy",
        order: 1,
        label: ko ? "Effiroad 번호 복사" : "Copy Effiroad number",
        description: ko
          ? "Google 비즈니스 프로필·웹·트럭에 붙여넣기 — 착신 코드 불필요."
          : "Paste on Google Business Profile, website, and trucks — no forwarding codes.",
        copyText: effiroadE164,
      },
      {
        id: "main-google",
        order: 2,
        label: ko ? "Google 비즈니스 프로필 열기" : "Open Google Business Profile",
        description: ko
          ? "프로필 수정 → 연락처 → 전화 → Effiroad 번호 저장."
          : "Edit profile → Contact → Phone → paste Effiroad number → Save.",
        externalHref: "https://business.google.com/",
        externalLabel: "business.google.com",
      },
    ];
  }

  if (provider === "google_voice") {
    return [
      {
        id: "gv-open",
        order: 1,
        label: ko ? "Google Voice 설정 열기" : "Open Google Voice settings",
        description: ko
          ? "Calls → Screen calls·발신자 ID 마스킹 끄기 → Effiroad 연결 번호 추가."
          : "Calls tab → turn off Screen calls & caller-ID masking → add Effiroad as linked/forward number.",
        externalHref: GOOGLE_VOICE_SETTINGS_URL,
        externalLabel: "voice.google.com/settings",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "dialpad") {
    return [
      {
        id: "dialpad-mainline",
        order: 1,
        label: ko ? "ServiceTitan / Main Line 경로" : "ServiceTitan / Main Line path",
        description: ko
          ? "Admin → Main Line → Business Hours & Call Routing → Fallback → external 번호."
          : "Admin → Main Line → Business Hours & Call Routing → Edit → Fallback or Other routing → external number.",
        externalHref: DIALPAD_ADMIN_MAIN_LINE_URL,
        externalLabel: "dialpad.com/officesettings",
        copyText: effiroadE164,
      },
      {
        id: "dialpad-user",
        order: 2,
        label: ko ? "Jobber Phone / 사용자 회선" : "Jobber Phone / user line path",
        description: ko
          ? "Settings → Users → 샵 회선 → 미응답 → external 번호."
          : "Settings → Users → shop line → When unanswered → Forward to external.",
        externalHref: DIALPAD_FORWARDING_URL,
        externalLabel: "dialpad.com/app",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "verizon") {
    const carrier = getCarrierQuickActions(provider, effiroadE164, locale);
    const star = carrier[0];
    return [
      {
        id: "verizon-star",
        order: 1,
        label: star?.label ?? (ko ? "Verizon *71 코드" : "Dial *71 on your shop phone"),
        description: ko
          ? "내 폰이 먼저 울립니다. Verizon 확인음을 기다리세요."
          : "Your phone rings first. Wait for a confirmation tone.",
        tapHref: star ? `tel:${encodeURIComponent(star.dial)}` : undefined,
        tapLabel: dialStar,
        copyText: star?.copyText,
        deactivateHref: star?.deactivateDial
          ? `tel:${encodeURIComponent(star.deactivateDial)}`
          : undefined,
        deactivateLabel: turnOff73,
      },
      {
        id: "verizon-web",
        order: 2,
        label: ko ? "My Verizon (미응답 시만)" : "Or use My Verizon (When unanswered only)",
        description: ko
          ? "Effiroad 번호 붙여넣기 → 저장. 전체 착신(Forward all) 금지."
          : "Paste Effiroad number → Save. Never Forward all.",
        externalHref: VERIZON_CALL_FORWARDING_WEB,
        externalLabel: ko ? "My Verizon 열기" : "Open My Verizon",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "ringcentral") {
    return [
      {
        id: "rc-admin",
        order: 1,
        label: ko ? "RingCentral Admin 열기" : "Open RingCentral Admin",
        description: ko
          ? "Phone System → User → Call Handling → 순차 울림 후 external."
          : "Phone System → User → Call Handling → sequential ring then external number.",
        externalHref: RINGCENTRAL_ADMIN_URL,
        externalLabel: ko ? "RingCentral admin" : "RingCentral admin",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "grasshopper") {
    return [
      {
        id: "gh-login",
        order: 1,
        label: ko ? "Grasshopper 열기" : "Open Grasshopper",
        description: ko
          ? "Extensions → 착신 번호 추가 → Effiroad → direct connect."
          : "Extensions → Add forwarding number → Effiroad → direct connect, caller ID on.",
        externalHref: GRASSHOPPER_LOGIN_URL,
        externalLabel: "grasshopper.com/login",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "xfinity") {
    const carrier = getCarrierQuickActions(provider, effiroadE164, locale);
    const star = carrier[0];
    return [
      {
        id: "xfinity-star",
        order: 1,
        label: star?.label ?? (ko ? "Xfinity *71 코드" : "Xfinity *71 code"),
        description: star?.description ?? (ko ? "Xfinity 폰에서만 실행." : "Dial from the Xfinity phone only."),
        tapHref: star ? `tel:${encodeURIComponent(star.dial)}` : undefined,
        tapLabel: dialStar,
        copyText: star?.copyText,
        deactivateHref: star?.deactivateDial
          ? `tel:${encodeURIComponent(star.deactivateDial)}`
          : undefined,
        deactivateLabel: turnOff73,
      },
      {
        id: "xfinity-faq",
        order: 2,
        label: ko ? "Xfinity 공식 가이드" : "Xfinity official guide",
        description: ko
          ? "Xfinity 지원 문서 — *71만 가능, 웹 활성화 없음."
          : "Xfinity support article — *71 only, no web activation.",
        externalHref: XFINITY_FORWARDING_FAQ,
        externalLabel: ko ? "Xfinity 착신전환 도움말" : "Xfinity forwarding help",
      },
    ];
  }

  const carrier = getCarrierQuickActions(provider, effiroadE164, locale);
  return carrier.map((c, i) => ({
    id: c.id,
    order: i + 1,
    label: c.label,
    description: c.description,
    tapHref: `tel:${encodeURIComponent(c.dial)}`,
    tapLabel: dialPhone,
    copyText: c.copyText,
    deactivateHref: c.deactivateDial ? `tel:${encodeURIComponent(c.deactivateDial)}` : undefined,
    deactivateLabel: turnOff,
  }));
}
