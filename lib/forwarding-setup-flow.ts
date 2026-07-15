import {
  DIALPAD_ADMIN_MAIN_LINE_URL,
  DIALPAD_FORWARDING_URL,
  getCarrierQuickActions,
  GOOGLE_VOICE_SETTINGS_URL,
  VERIZON_CALL_FORWARDING_WEB,
  VERIZON_FORWARDING_FAQ,
  VERIZON_MY_VERIZON_URL,
} from "./forwarding-carrier-codes";
import { isDirectEffiroadLineProvider, type ForwardingProviderId } from "./forwarding-guides-en";

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
): ForwardingSetupAction[] {
  if (isDirectEffiroadLineProvider(provider)) {
    return [
      {
        id: "main-copy",
        order: 1,
        label: "Copy Effiroad number",
        description: "Paste on Google Business Profile, website, and trucks — no forwarding codes.",
        copyText: effiroadE164,
      },
      {
        id: "main-google",
        order: 2,
        label: "Open Google Business Profile",
        description: "Edit profile → Contact → Phone → paste Effiroad number → Save.",
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
        label: "Open Google Voice settings",
        description:
          "Calls tab → turn off Screen calls & caller-ID masking → add Effiroad as linked/forward number.",
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
        label: "ServiceTitan / Main Line path",
        description:
          "Admin → Main Line → Business Hours & Call Routing → Edit → Fallback or Other routing → external number.",
        externalHref: DIALPAD_ADMIN_MAIN_LINE_URL,
        externalLabel: "dialpad.com/officesettings",
        copyText: effiroadE164,
      },
      {
        id: "dialpad-user",
        order: 2,
        label: "Jobber Phone / user line path",
        description: "Settings → Users → shop line → When unanswered → Forward to external.",
        externalHref: DIALPAD_FORWARDING_URL,
        externalLabel: "dialpad.com/app",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "verizon") {
    const carrier = getCarrierQuickActions(provider, effiroadE164);
    const star = carrier[0];
    const actions: ForwardingSetupAction[] = [
      {
        id: "verizon-star",
        order: 1,
        label: star?.label ?? "Verizon *71 code",
        description: star?.description ?? "Dial from the shop phone.",
        tapHref: star ? `tel:${encodeURIComponent(star.dial)}` : undefined,
        tapLabel: "Dial *71 on this phone",
        copyText: star?.copyText,
        deactivateHref: star?.deactivateDial
          ? `tel:${encodeURIComponent(star.deactivateDial)}`
          : undefined,
        deactivateLabel: "Turn off (*73)",
      },
      {
        id: "verizon-web",
        order: 2,
        label: "Or use My Verizon (web or app)",
        description:
          "When unanswered / No answer only — never Forward all. Paste Effiroad number → Save.",
        externalHref: VERIZON_CALL_FORWARDING_WEB,
        externalLabel: "m.vzw.com/callforwarding",
        copyText: effiroadE164,
      },
      {
        id: "verizon-app",
        order: 3,
        label: "My Verizon app download",
        description: "Account → your line → Manage call forwarding → When unanswered.",
        externalHref: VERIZON_MY_VERIZON_URL,
        externalLabel: "My Verizon app help",
        copyText: effiroadE164,
      },
      {
        id: "verizon-faq",
        order: 4,
        label: "Verizon official guide",
        description: "If app and *71 both fail — Verizon FAQ or 800-922-0204.",
        externalHref: VERIZON_FORWARDING_FAQ,
        externalLabel: "Verizon forwarding FAQ",
      },
    ];
    return actions;
  }

  const carrier = getCarrierQuickActions(provider, effiroadE164);
  return carrier.map((c, i) => ({
    id: c.id,
    order: i + 1,
    label: c.label,
    description: c.description,
    tapHref: `tel:${encodeURIComponent(c.dial)}`,
    tapLabel: "Dial on this phone",
    copyText: c.copyText,
    deactivateHref: c.deactivateDial ? `tel:${encodeURIComponent(c.deactivateDial)}` : undefined,
    deactivateLabel: "Turn off",
  }));
}
