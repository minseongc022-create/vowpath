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
    return [
      {
        id: "verizon-star",
        order: 1,
        label: star?.label ?? "Dial *71 on your shop phone",
        description: "Your phone rings first. Wait for a confirmation tone.",
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
        label: "Or use My Verizon (When unanswered only)",
        description: "Paste Effiroad number → Save. Never Forward all.",
        externalHref: VERIZON_CALL_FORWARDING_WEB,
        externalLabel: "Open My Verizon",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "ringcentral") {
    return [
      {
        id: "rc-admin",
        order: 1,
        label: "Open RingCentral Admin",
        description: "Phone System → User → Call Handling → sequential ring then external number.",
        externalHref: RINGCENTRAL_ADMIN_URL,
        externalLabel: "RingCentral admin",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "grasshopper") {
    return [
      {
        id: "gh-login",
        order: 1,
        label: "Open Grasshopper",
        description: "Extensions → Add forwarding number → Effiroad → direct connect, caller ID on.",
        externalHref: GRASSHOPPER_LOGIN_URL,
        externalLabel: "grasshopper.com/login",
        copyText: effiroadE164,
      },
    ];
  }

  if (provider === "xfinity") {
    const carrier = getCarrierQuickActions(provider, effiroadE164);
    const star = carrier[0];
    return [
      {
        id: "xfinity-star",
        order: 1,
        label: star?.label ?? "Xfinity *71 code",
        description: star?.description ?? "Dial from the Xfinity phone only.",
        tapHref: star ? `tel:${encodeURIComponent(star.dial)}` : undefined,
        tapLabel: "Dial *71 on this phone",
        copyText: star?.copyText,
        deactivateHref: star?.deactivateDial
          ? `tel:${encodeURIComponent(star.deactivateDial)}`
          : undefined,
        deactivateLabel: "Turn off (*73)",
      },
      {
        id: "xfinity-faq",
        order: 2,
        label: "Xfinity official guide",
        description: "Xfinity support article — *71 only, no web activation.",
        externalHref: XFINITY_FORWARDING_FAQ,
        externalLabel: "Xfinity forwarding help",
      },
    ];
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
