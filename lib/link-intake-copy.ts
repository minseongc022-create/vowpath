import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";
import { smsLinkIntakeBody } from "./sms-templates";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      `Hi — thank you for calling ${shop}. ` +
      afterHoursVoiceIntro(shop) +
      ` Press 1 and we'll text you a quick link to report the loss — about a minute. ` +
      `Press 2 to tell us what's going on right on this call. We're here to help.`
    );
  }
  return (
    `Hi — thanks for calling ${shop}. ` +
    `Press 1 and we'll text you a quick link to report what's going on. ` +
    `Press 2 to walk us through it on this call. Whatever's easier — we've got you.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for the text link, or 2 to talk with us here.";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  return smsLinkIntakeBody(shopName, url);
}

/** Customer-facing portal & link intake — US restoration tone. */
export const linkIntakePageCopy = {
  formTitle: "Report your loss",
  formDescription:
    "We're sorry you're dealing with this — you're in the right place. Tell us what's going on below and our team will take it from here. We'll keep you updated by text.",
  nameLabel: "Your name",
  namePlaceholder: "Sarah Mitchell",
  addressLabel: "Property address",
  addressPlaceholder: "Start typing — street number, city, or ZIP",
  addressHintSearch:
    "Start typing — your address should pop right up. Street number, street name, city, or ZIP all work.",
  addressHintManual:
    "Type your full US property address — we'll make sure the right crew is dispatched.",
  addressLoading: "Looking up addresses…",
  addressSearchReady: "Keep typing — matches show up as you go. Tap one to confirm!",
  addressSearchError:
    "Search is slow right now — keep typing or switch to Type it in.",
  addressSearchRetry: "Try again",
  addressTabSearch: "Find my address",
  addressTabManual: "Type it in",
  addressUnitLabel: "Apt / unit / gate code (optional)",
  addressUnitPlaceholder: "Apt 4B, Unit 12, gate 1234…",
  addressConfirmedLabel: "Address confirmed",
  addressPickRequired:
    "Pick your address from the list, or switch to Type it in and fill in street, city, state, and ZIP.",
  addressManualStreet: "Street address",
  addressManualCity: "City",
  addressManualState: "ST",
  addressManualZip: "ZIP code",
  addressManualApply: "Confirm address",
  addressManualIncomplete: "Fill in street, city, state, and ZIP.",
  addressManualInvalid: "That doesn't look like a full US address yet — check city, state, and ZIP.",
  issueLabel: "What's going on?",
  issuePlaceholder:
    "Basement flooding from burst pipe\nWater through ceiling\nSmoke smell after fire\nMold in bathroom\nSewage backup",
  photoLabel: "Photo of the damage",
  photoOptional: "Optional — helps our crew prepare",
  photoHint: "A quick photo helps our crew bring the right equipment.",
  photoButton: "Add a photo",
  photoChange: "Change photo",
  urgencyLabel: "How urgent is this?",
  slotStepTitle: "When can we arrive?",
  slotStepDescription:
    "Pick the soonest window that works — for emergencies we'll prioritize the earliest available crew.",
  slotCalendarHint: (intervalMin: number, _bufferMin: number, capacity: number) => {
    const hours = Math.floor(intervalMin / 60);
    const mins = intervalMin % 60;
    const spacing =
      mins > 0
        ? `${hours > 0 ? `${hours} hr ` : ""}${mins} min blocks`
        : `${hours}-hour arrival windows`;
    const base = `Times show ${spacing} — crew arrival windows.`;
    const team =
      capacity > 1
        ? " More than one crew may be available — pick what works best."
        : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `${weekday} — open windows`,
  slotUnavailable: "Full",
  slotPast: "Too soon",
  slotCalendarLegend:
    "Strikethrough windows are full. Gray means that time passed or is too soon. Your info stays private.",
  slotStepBack: "Go back",
  slotStepConfirm: "Confirm this window",
  slotStepLoading: "Loading open windows…",
  slotStepEmpty:
    "No open windows right now — submit your request and we'll call you to coordinate arrival.",
  slotStepSkip: "Skip — just send my request",
  submit: "Next — pick arrival window",
  submitNoSlots: "Send my request",
  smsConsentLabel:
    "Yes — text me about this request (updates, crew ETA, etc.). Msg & data rates may apply. Reply STOP anytime.",
  smsConsentRequired: "Check the box so we can text you about your request.",
  selectVisitTime: "Pick an arrival window and we'll take it from there.",
  networkError: "Connection issue — please try again.",
  slotLoadFailed: "Couldn't load open windows — please try again.",
  submitting: "Sending your request…",
  eta: "~1 min",
  successTitle: "You're all set",
  successBody:
    "Thank you — we have your details. We'll confirm arrival by text soon. Tap Edit if anything needs to change.",
  requestNumberLabel: "Request #",
  submissionTitle: "Your loss report",
  submissionSummaryTitle: "Quick summary",
  portalGateTitle: "Find your request",
  portalGateDescription: "Enter the name and phone number you used — we'll pull up your request.",
  portalPhoneLabel: "Mobile number",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "Show my request",
  portalLooking: "Looking…",
  portalLookupFailed: "We couldn't find a match — double-check your name and number.",
  portalBackToLookup: "Try again",
  portalEditTitle: "Update your details",
  portalEdit: "Edit",
  portalSave: "Save changes",
  portalSaving: "Saving…",
  portalUpdateSuccessBody: "Got it — your updates are in. Our team will follow up if needed.",
  portalSubmittedAt: "Submitted",
  loadingSubmission: "Loading your request…",
  loadSubmissionFailed: "Couldn't load this link. Try again or call the company directly.",
  expiredTitle: "This link expired",
  expiredBody: "This link isn't active anymore. Call the company and we'll get you taken care of.",
  correctionViewTitle: "Review your request",
  correctionViewHint: "Make sure everything looks good — tap Edit if anything needs a change.",
  correctionEditTitle: "Edit your request",
  correctionDoneTitle: "Update sent",
  correctionDoneBody: "The company got your changes and will follow up during business hours.",
  correctionExpired: "This link expired or isn't valid anymore.",
  bookingPortalTitle: "Your service request",
  bookingStatusLabel: "Status",
  bookingTimeLabel: "Arrival window",
  bookingTimeHint: "Our crew will aim for this window. We'll text you to confirm.",
  bookingChangeTime: "Change arrival window",
  bookingEditDetails: "Update address or loss details",
  bookingCancel: "Cancel request",
  bookingRescheduleHint: "Pick a new open window below.",
  bookingConfirmTime: "Confirm new window",
  bookingCancelConfirmTitle: "Cancel this request?",
  bookingCancelConfirmBody: "We'll let the company know. You can always call back if you still need help.",
  bookingCancelConfirmButton: "Yes, cancel my request",
  portalBackToView: "Back",
  portalLandingTitle: "Report a loss",
  portalLandingBody:
    "Open the link from your text message to submit details or check your request status.",
} as const;
