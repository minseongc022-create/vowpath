import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";
import { smsLinkIntakeBody } from "./sms-templates";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      `Hi there! Thanks for calling ${shop}. ` +
      afterHoursVoiceIntro(shop) +
      ` Press 1 and we'll text you a quick link to book — super easy! ` +
      `Press 2 to tell us what you need right on this call.`
    );
  }
  return (
    `Hi! Thanks for calling ${shop} — we're so glad you reached out! ` +
    `Press 1 and we'll text you a quick booking link you can tap. ` +
    `Press 2 to share what you need on this call.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Go ahead — press 1 for the text link, or 2 to keep talking with us here!";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  return smsLinkIntakeBody(shopName, url);
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
  slotCalendarHint: (intervalMin: number, _bufferMin: number, capacity: number) => {
    const hours = Math.floor(intervalMin / 60);
    const mins = intervalMin % 60;
    const spacing =
      mins > 0
        ? `${hours > 0 ? `${hours} hr ` : ""}${mins} min apart`
        : `${hours}-hour spacing`;
    const base = `Visit times are ${spacing} (e.g. 8:00 AM, then the next open slot after that).`;
    const team =
      capacity > 1
        ? " Some overlapping times may show when multiple crews are free."
        : "";
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
  smsConsentLabel:
    "I agree to receive service-related text messages about this request. Message and data rates may apply. Reply STOP to opt out.",
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
  bookingPortalTitle: "Your booking",
  bookingStatusLabel: "Status",
  bookingTimeLabel: "Visit time",
  bookingChangeTime: "Change visit time",
  bookingEditDetails: "Edit address or issue",
  bookingCancel: "Cancel visit",
  bookingRescheduleHint: "Pick a new open time below.",
  bookingConfirmTime: "Confirm new time",
  bookingCancelConfirmTitle: "Cancel this visit?",
  bookingCancelConfirmBody: "We'll notify the shop. You can always call to book again.",
  bookingCancelConfirmButton: "Yes, cancel visit",
  portalBackToView: "Back",
} as const;
