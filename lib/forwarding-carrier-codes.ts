import type { ForwardingProviderId } from "./forwarding-guides-en";
import type { UiLocale } from "./locale";
import { runtimeUiLocale } from "./locale";

export type CarrierQuickAction = {
  id: string;
  label: string;
  description: string;
  dial: string;
  copyText: string;
  deactivateDial?: string;
};

function tenDigit(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits.slice(-10);
}

export function getCarrierQuickActions(
  provider: ForwardingProviderId,
  effiroadE164: string,
  locale?: UiLocale,
): CarrierQuickAction[] {
  const ko = (locale ?? runtimeUiLocale()) === "ko";
  const td = tenDigit(effiroadE164);
  if (!td || td.length !== 10) return [];

  if (provider === "att") {
    const code = `**61*1${td}*11*20#`;
    const alt = `**61*1${td}#`;
    return [
      {
        id: "att-no-answer",
        label: ko ? "AT&T — 미응답 착신 (20초)" : "AT&T — activate (20 sec ring)",
        description: ko
          ? "기본 코드. AT&T 확인음·문자를 기다리세요."
          : "Primary code. Wait for AT&T confirmation text or tone.",
        dial: code,
        copyText: code,
        deactivateDial: "##61#",
      },
      {
        id: "att-no-answer-alt",
        label: ko ? "AT&T — 대체 코드" : "AT&T — alternate (if first fails)",
        description: ko
          ? "첫 코드가 실패하면 이 코드를 시도하세요."
          : "Shorter code without ring timer — try if the primary code errors.",
        dial: alt,
        copyText: alt,
        deactivateDial: "##61#",
      },
    ];
  }

  if (provider === "tmobile") {
    const code20 = `**61*1${td}**20#`;
    const code = `**61*1${td}#`;
    const tenOnly = `**61*${td}#`;
    return [
      {
        id: "tmobile-no-answer-20s",
        label: ko ? "T-Mobile — 미응답 착신 (20초)" : "T-Mobile — activate (20 sec ring)",
        description: ko
          ? "기본 코드. 미응답 조건부만 — T-Mobile 확인음·문자 대기."
          : "Primary code. No-answer only — wait for T-Mobile confirmation tone or text.",
        dial: code20,
        copyText: code20,
        deactivateDial: "##61#",
      },
      {
        id: "tmobile-no-answer",
        label: ko ? "T-Mobile — 대체 코드 (기본)" : "T-Mobile — alternate (carrier default ring)",
        description: ko
          ? "20초 코드가 실패하면 시도하세요."
          : "Shorter code without ring timer — try if the 20-second code errors.",
        dial: code,
        copyText: code,
        deactivateDial: "##61#",
      },
      {
        id: "tmobile-no-answer-alt",
        label: ko ? "T-Mobile — 대체 (10자리)" : "T-Mobile — alternate (10-digit)",
        description: ko
          ? "Metro / Mint에서 위 코드가 안 될 때."
          : "Try if the first codes fail on Metro / Mint.",
        dial: tenOnly,
        copyText: tenOnly,
        deactivateDial: "##004#",
      },
    ];
  }

  if (provider === "verizon" || provider === "xfinity") {
    const code = `*71${td}`;
    const label = ko
      ? provider === "xfinity"
        ? "Xfinity — *71 코드"
        : "Verizon — *71 코드"
      : provider === "xfinity"
        ? "Xfinity — dial *71 code"
        : "Verizon — dial *71 code";
    const description = ko
      ? provider === "xfinity"
        ? "Xfinity 공식 조건부 착신 — Xfinity 폰에서만 활성화."
        : "Verizon 공식 조건부 착신. 내 폰이 먼저 울린 뒤 Effiroad로 넘어갑니다."
      : provider === "xfinity"
        ? "Xfinity official conditional forward — activate only from the Xfinity phone."
        : "Official Verizon conditional forward (no-answer + busy). Phone rings first, then Effiroad.";
    return [
      {
        id: `${provider}-conditional`,
        label,
        description,
        dial: code,
        copyText: code,
        deactivateDial: "*73",
      },
    ];
  }

  return [];
}

export const GOOGLE_VOICE_SETTINGS_URL = "https://voice.google.com/u/0/settings";

export const VERIZON_MY_VERIZON_URL = "https://www.verizon.com/support/my-verizon-app/";
export const VERIZON_CALL_FORWARDING_WEB = "https://m.vzw.com/callforwarding";
export const VERIZON_FORWARDING_FAQ = "https://www.verizon.com/support/call-forwarding-faqs/";
export const DIALPAD_FORWARDING_URL = "https://dialpad.com/app";
export const DIALPAD_ADMIN_MAIN_LINE_URL = "https://dialpad.com/officesettings";
export const XFINITY_FORWARDING_FAQ =
  "https://www.xfinity.com/support/articles/how-to-use-call-forwarding";
export const RINGCENTRAL_ADMIN_URL = "https://service.ringcentral.com/";
export const GRASSHOPPER_LOGIN_URL = "https://grasshopper.com/login/";
