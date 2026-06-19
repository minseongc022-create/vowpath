import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      afterHoursVoiceIntro(shop) +
      " Press 1 and we will text you a quick intake link, then you can hang up. Press 2 to continue by phone."
    );
  }
  return (
    `Thank you for calling ${shop}. ` +
    `Press 1 and we will text you a quick intake link, then you can hang up. ` +
    `Press 2 to continue by phone.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for the text link, or press 2 for phone intake.";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop}: Submit your service request here — name, address, issue, and preferred visit time. ` +
    `Open the link to finish quick intake.\n\n${url}`
  );
}

export const linkIntakePageCopy = {
  formTitle: "Service request",
  formDescription:
    "Tell us what you need. Our team reviews every request — you will get a confirmation when the shop approves.",
  nameLabel: "Name",
  namePlaceholder: "John Smith",
  addressLabel: "Service address",
  addressPlaceholder: "Street, city, state, ZIP",
  issueLabel: "What do you need help with?",
  issuePlaceholder:
    "AC not cooling\nWater heater leaking\nBreaker keeps tripping",
  photoLabel: "Photo",
  photoOptional: "Optional",
  photoHint: "A photo helps us diagnose faster.",
  photoButton: "Add photo",
  photoChange: "Change photo",
  urgencyLabel: "Urgency",
  slotStepTitle: "Pick a visit time",
  slotStepDescription: "Choose a date, then tap an open time. Unavailable slots are grayed out.",
  slotCalendarHint: (durationMin: number, bufferMin: number, capacity: number) => {
    const base = `Each visit is about ${durationMin} minutes. ${
      bufferMin > 0
        ? `Exactly ${bufferMin} minutes are reserved after each visit ends before the next slot opens.`
        : "Pick any open slot."
    }`;
    const team =
      capacity > 1 ? " Some overlapping times may be available when the team has capacity." : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `Times on ${weekday}`,
  slotUnavailable: "Unavailable",
  slotCalendarLegend: "Grey times are already booked or too soon. Other customers' details are never shown.",
  slotStepBack: "Back",
  slotStepConfirm: "Confirm this time",
  slotStepLoading: "Loading available times…",
  slotStepEmpty:
    "No times to show right now. We'll take your request and call you back.",
  slotStepSkip: "Submit without picking a time",
  submit: "Next — pick a time",
  submitNoSlots: "Submit request",
  submitting: "Submitting…",
  eta: "~1 min",
  successTitle: "Request received",
  successBody: "Review the details below. Tap Edit if something looks wrong.",
  requestNumberLabel: "Request #",
  submissionTitle: "Your request",
  submissionSummaryTitle: "Summary",
  portalGateTitle: "View your request",
  portalGateDescription: "Enter the name and phone number you used to submit.",
  portalPhoneLabel: "Phone",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "View request",
  portalLooking: "Looking up…",
  portalLookupFailed: "No matching request found.",
  portalBackToLookup: "Try again",
  portalEditTitle: "Edit request",
  portalEdit: "Edit",
  portalSave: "Save changes",
  portalSaving: "Saving…",
  portalUpdateSuccessBody: "Updates sent to the shop. They'll follow up soon.",
  portalSubmittedAt: "Submitted",
  loadingSubmission: "Loading…",
  loadSubmissionFailed: "Couldn't load this request.",
  expiredTitle: "Link expired",
  expiredBody: "This link is no longer valid. Please call the shop again.",
  correctionViewTitle: "Review your request",
  correctionViewHint: "Check the details below. Tap Edit to fix anything.",
  correctionEditTitle: "Edit request",
  correctionDoneTitle: "Update sent",
  correctionDoneBody: "The shop was notified. They'll follow up during business hours.",
  correctionExpired: "This link expired or is invalid.",
} as const;
