import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      afterHoursVoiceIntro(shop) +
      " Press 1 to receive a text link to submit your request, or stay on the line to continue by phone."
    );
  }
  return (
    `Thank you for calling ${shop}. ` +
    `For faster intake, press 1 to receive a text link. ` +
    `To continue by phone, stay on the line or start speaking.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for a text link, or describe your issue to continue by phone.";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop}: Submit your service request here — name, address, and issue. ` +
    `Our team will follow up during business hours.\n\n${url}`
  );
}

export const linkIntakePageCopy = {
  formTitle: "Service request",
  formDescription:
    "Tell us what you need. Our team reviews every request and follows up during business hours.",
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
  slotStepTitle: "Pick a visit window",
  slotStepDescription: "Choose one available time (up to 5 options).",
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
