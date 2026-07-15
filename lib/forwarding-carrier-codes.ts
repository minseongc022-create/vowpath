import type { ForwardingProviderId } from "./forwarding-guides-en";

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
): CarrierQuickAction[] {
  const td = tenDigit(effiroadE164);
  if (!td || td.length !== 10) return [];

  if (provider === "att") {
    const code = `**61*1${td}*11*20#`;
    const alt = `**61*1${td}#`;
    return [
      {
        id: "att-no-answer",
        label: "AT&T — activate (20 sec ring)",
        description: "Primary code. Wait for AT&T confirmation text or tone.",
        dial: code,
        copyText: code,
        deactivateDial: "##61#",
      },
      {
        id: "att-no-answer-alt",
        label: "AT&T — alternate (if first fails)",
        description: "Shorter code without ring timer — try if the primary code errors.",
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
        label: "T-Mobile — activate (20 sec ring)",
        description:
          "Primary code. No-answer only — wait for T-Mobile confirmation tone or text.",
        dial: code20,
        copyText: code20,
        deactivateDial: "##61#",
      },
      {
        id: "tmobile-no-answer",
        label: "T-Mobile — alternate (carrier default ring)",
        description: "Shorter code without ring timer — try if the 20-second code errors.",
        dial: code,
        copyText: code,
        deactivateDial: "##61#",
      },
      {
        id: "tmobile-no-answer-alt",
        label: "T-Mobile — alternate (10-digit)",
        description: "Try if the first codes fail on Metro / Mint.",
        dial: tenOnly,
        copyText: tenOnly,
        deactivateDial: "##004#",
      },
    ];
  }

  if (provider === "verizon" || provider === "xfinity") {
    const code = `*71${td}`;
    const label =
      provider === "xfinity"
        ? "Xfinity — dial *71 code"
        : "Verizon — dial *71 code";
    const description =
      provider === "xfinity"
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
