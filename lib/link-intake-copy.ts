import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";
import { smsLinkIntakeBody } from "./sms-templates";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      `Hi! Thanks for calling ${shop}. ` +
      afterHoursVoiceIntro(shop) +
      ` Press 1 and we'll text you a quick link to book — super easy! ` +
      `Press 2 to tell us what's going on right on this call.`
    );
  }
  return (
    `Hi! Thanks for calling ${shop} — we're glad you reached out! ` +
    `Press 1 and we'll text you a quick booking link. ` +
    `Press 2 to share what you need on this call.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for the text link, or 2 to keep talking with us here!";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  return smsLinkIntakeBody(shopName, url);
}

/** Customer-facing portal & link intake — US HVAC tone (arrival windows, warm & direct). */
export const linkIntakePageCopy = {
  formTitle: "Book your visit",
  formDescription:
    "Hey there! 👋 Tell us what's going on with your system — heat, AC, or anything in between. Our team reviews every request and confirms your arrival window. We'll text you updates along the way!",
  nameLabel: "Your name",
  namePlaceholder: "John Smith",
  addressLabel: "Service address",
  addressPlaceholder: "Start typing your street address…",
  addressHint:
    "Start typing and pick your home from the list — we need a verified US service address for your tech.",
  addressLoading: "Loading address search…",
  addressUnitLabel: "Apt / unit / gate code (optional)",
  addressUnitPlaceholder: "Apt 4B, Unit 12, gate 1234…",
  addressConfirmedLabel: "Address confirmed",
  addressPickRequired:
    "Pick your address from the suggestions, or enter street, city, state, and ZIP.",
  addressManualTitle: "Enter address manually",
  addressManualStreet: "Street address",
  addressManualCity: "City",
  addressManualState: "ST",
  addressManualZip: "ZIP code",
  addressManualApply: "Use this address",
  addressManualSwitch: "Can't find it? Enter address manually",
  addressSearchSwitch: "Search with Google instead",
  issueLabel: "What's going on?",
  issuePlaceholder:
    "AC blowing warm air\nFurnace won't kick on\nWater leaking near unit",
  photoLabel: "Photo of the issue",
  photoOptional: "Optional — helps a lot!",
  photoHint: "A quick pic helps our tech know what to bring. 📸",
  photoButton: "Add a photo",
  photoChange: "Change photo",
  urgencyLabel: "How soon do you need us?",
  slotStepTitle: "Pick your arrival window",
  slotStepDescription:
    "Choose a day, then tap an open window. Your tech arrives anytime during that block — we'll text you when we're on the way! 🚐",
  slotCalendarHint: (intervalMin: number, _bufferMin: number, capacity: number) => {
    const hours = Math.floor(intervalMin / 60);
    const mins = intervalMin % 60;
    const spacing =
      mins > 0
        ? `${hours > 0 ? `${hours} hr ` : ""}${mins} min blocks`
        : `${hours}-hour arrival windows`;
    const base = `Times show ${spacing} — same way most HVAC companies schedule (e.g. 8–10 AM, then the next open window).`;
    const team =
      capacity > 1
        ? " More than one crew may be free at the same time — pick what works best for you!"
        : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `${weekday} — open windows`,
  slotUnavailable: "Booked",
  slotCalendarLegend:
    "Gray windows are full or too soon to book. Your info stays private — we never show other customers' details.",
  slotStepBack: "Go back",
  slotStepConfirm: "Lock in this window!",
  slotStepLoading: "Loading open windows…",
  slotStepEmpty:
    "No open windows right now — no worries! Submit your request and we'll call you to find a time that works. 📞",
  slotStepSkip: "Skip for now — just send my request",
  submit: "Next — pick an arrival window",
  submitNoSlots: "Send my request",
  smsConsentLabel:
    "Yes — text me about this visit (appointment updates, arrival window, etc.). Msg & data rates may apply. Reply STOP anytime.",
  smsConsentRequired: "Please check the box so we can text you about your visit!",
  selectVisitTime: "Pick an arrival window to continue!",
  networkError: "Connection hiccup — mind trying again?",
  slotLoadFailed: "Couldn't load open windows. Please try again.",
  submitting: "Sending…",
  eta: "~1 min",
  successTitle: "You're all set!",
  successBody:
    "Thanks for reaching out! 🔧 Review your details below — tap Edit if anything needs a tweak. We'll confirm your arrival window by text!",
  requestNumberLabel: "Request #",
  submissionTitle: "Your visit request",
  submissionSummaryTitle: "Quick summary",
  portalGateTitle: "Find your visit",
  portalGateDescription:
    "Enter the name and phone number you used — we'll pull up your request in a snap!",
  portalPhoneLabel: "Mobile number",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "Show my request",
  portalLooking: "Looking…",
  portalLookupFailed: "Hmm — we couldn't find a match. Double-check your name and number?",
  portalBackToLookup: "Try again",
  portalEditTitle: "Update your details",
  portalEdit: "Edit",
  portalSave: "Save changes",
  portalSaving: "Saving…",
  portalUpdateSuccessBody:
    "Got it — updates sent! ✅ Our team will follow up if anything else is needed.",
  portalSubmittedAt: "Submitted",
  loadingSubmission: "Loading your request…",
  loadSubmissionFailed: "Couldn't load this link. Try again or call the shop.",
  expiredTitle: "This link expired",
  expiredBody:
    "This link isn't active anymore. Give the shop a quick call and we'll get you taken care of!",
  correctionViewTitle: "Review your request",
  correctionViewHint: "Make sure everything looks good — tap Edit to fix anything.",
  correctionEditTitle: "Edit your request",
  correctionDoneTitle: "Update sent!",
  correctionDoneBody:
    "Thanks! ✅ The shop got your changes and will follow up during business hours.",
  correctionExpired: "This link expired or isn't valid anymore.",
  bookingPortalTitle: "Your visit",
  bookingStatusLabel: "Status",
  bookingTimeLabel: "Arrival window",
  bookingTimeHint: "Your tech arrives anytime during this window. We'll text when we're headed your way!",
  bookingChangeTime: "Change arrival window",
  bookingEditDetails: "Update address or issue",
  bookingCancel: "Cancel visit",
  bookingRescheduleHint: "Pick a new open window below — same day blocks as when you booked.",
  bookingConfirmTime: "Confirm new window",
  bookingCancelConfirmTitle: "Cancel this visit?",
  bookingCancelConfirmBody:
    "No problem — we'll let the shop know. You can always call back to rebook anytime!",
  bookingCancelConfirmButton: "Yes, cancel my visit",
  portalBackToView: "Back",
  portalLandingTitle: "Book with us",
  portalLandingBody:
    "Open the link from your text message to book a visit or check your arrival window. 👋",
} as const;
