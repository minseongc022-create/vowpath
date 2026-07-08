import {
  DIALPAD_FORWARDING_URL,
  getCarrierQuickActions,
  GOOGLE_VOICE_SETTINGS_URL,
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
        description: "Calls → add Effiroad as unanswered forward destination.",
        externalHref: GOOGLE_VOICE_SETTINGS_URL,
        externalLabel: "voice.google.com/settings",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "dialpad") {
    return [
      {
        id: "dialpad-open",
        order: 1,
        label: "Open Dialpad web app",
        description: "Settings → Users → your shop line → When unanswered → Forward to external.",
        externalHref: DIALPAD_FORWARDING_URL,
        externalLabel: "Open dialpad.com/app",
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
        id: "verizon-app",
        order: 2,
        label: "Or use My Verizon app",
        description:
          "Account → your line → Call forwarding → When unanswered → paste Effiroad number.",
        externalHref: VERIZON_MY_VERIZON_URL,
        externalLabel: "My Verizon app",
        copyText: effiroadE164,
      },
      {
        id: "verizon-faq",
        order: 3,
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
