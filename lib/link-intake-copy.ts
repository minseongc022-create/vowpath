import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";
import { smsLinkIntakeBody } from "./sms-templates";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      `Hi there! Thank you so much for calling ${shop} — I'm really glad you reached out. ` +
      afterHoursVoiceIntro(shop) +
      ` If you'd like, press 1 and we'll text you a quick link to book. It takes about a minute, and you can do it whenever you're ready. ` +
      `Or press 2 if you'd rather tell us what's going on right here on the call. Either way, we're here for you — no rush at all.`
    );
  }
  return (
    `Hi there! Thanks so much for calling ${shop} — we're really happy you reached out! ` +
    `Press 1 and we'll text you a quick booking link — super easy, about a minute. ` +
    `Press 2 if you'd like to walk us through what's going on right on this call. Whatever's easier for you — we've got you!`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for the text link, or 2 to talk with us here — whatever feels easiest!";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  return smsLinkIntakeBody(shopName, url);
}

/** Customer-facing portal & link intake — warm, human US HVAC tone. */
export const linkIntakePageCopy = {
  formTitle: "Book your visit",
  formDescription:
    "Hey there — so glad you reached out! Whatever's going on with your heat or AC, you're in the right place. Tell us a little about it below and our team will personally take it from here. We'll keep you posted every step of the way by text. You've got this, and we've got you!",
  nameLabel: "Your name",
  namePlaceholder: "John Smith",
  addressLabel: "Service address",
  addressPlaceholder: "Start typing — street number, city, or ZIP",
  addressHintSearch:
    "Just start typing — your address should pop right up. Street number, street name, city, or ZIP all work. Tap yours when you see it!",
  addressHintManual:
    "No problem at all — type your full US service address here and we'll make sure the right tech heads your way.",
  addressLoading: "Looking up addresses for you…",
  addressSearchReady: "Keep typing — matches show up as you go. Tap one to confirm!",
  addressSearchError:
    "Search is being a little slow right now — keep typing and we'll try again, or switch to Type it in. Either way, we'll get your address!",
  addressSearchRetry: "Try again",
  addressTabSearch: "Find my address",
  addressTabManual: "Type it in",
  addressUnitLabel: "Apt / unit / gate code (optional)",
  addressUnitPlaceholder: "Apt 4B, Unit 12, gate 1234…",
  addressConfirmedLabel: "Address confirmed",
  addressPickRequired:
    "Almost there — pick your address from the list, or switch to Type it in and fill in street, city, state, and ZIP.",
  addressManualStreet: "Street address",
  addressManualCity: "City",
  addressManualState: "ST",
  addressManualZip: "ZIP code",
  addressManualApply: "Confirm address",
  addressManualIncomplete: "Fill in street, city, state, and ZIP and you're good to go!",
  addressManualInvalid: "That doesn't look like a full US address yet — double-check city, state, and ZIP?",
  issueLabel: "What's going on?",
  issuePlaceholder:
    "AC blowing warm air\nFurnace won't kick on\nWater leaking near unit",
  photoLabel: "Photo of the issue",
  photoOptional: "Optional — helps a lot!",
  photoHint: "A quick pic helps our tech know exactly what to bring. No pressure though!",
  photoButton: "Add a photo",
  photoChange: "Change photo",
  urgencyLabel: "How soon do you need us?",
  slotStepTitle: "Pick your arrival window",
  slotStepDescription:
    "Pick a day and time that works best for you! Your tech arrives anytime during that window — we'll shoot you a friendly text when we're on the way.",
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
        ? " More than one crew may be free at the same time — pick whatever works best for you!"
        : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `${weekday} — open windows`,
  slotUnavailable: "Full",
  slotPast: "Too soon",
  slotCalendarLegend:
    "Strikethrough windows are full. Lighter gray means that time already passed or is too soon to book. Your info stays private — we never show other customers' details.",
  slotStepBack: "Go back",
  slotStepConfirm: "Lock in this window!",
  slotStepLoading: "Loading open windows…",
  slotStepEmpty:
    "No open windows right now — no worries at all! Submit your request and we'll personally call you to find a time that works.",
  slotStepSkip: "Skip for now — just send my request",
  submit: "Next — pick an arrival window",
  submitNoSlots: "Send my request",
  smsConsentLabel:
    "Yes — text me about this visit (appointment updates, arrival window, etc.). Msg & data rates may apply. Reply STOP anytime.",
  smsConsentRequired: "One quick thing — check the box so we can text you about your visit!",
  selectVisitTime: "Pick an arrival window and we'll take it from there!",
  networkError: "Hmm, connection hiccup — mind giving it another try? We're right here.",
  slotLoadFailed: "Couldn't load open windows just now — please try again in a sec!",
  submitting: "Sending your request…",
  eta: "~1 min",
  successTitle: "You're all set!",
  successBody:
    "Thank you so much for reaching out — we really appreciate you! Take a quick look below and tap Edit if anything needs a tweak. We'll confirm your arrival window by text very soon!",
  requestNumberLabel: "Request #",
  submissionTitle: "Your visit request",
  submissionSummaryTitle: "Quick summary",
  portalGateTitle: "Find your visit",
  portalGateDescription:
    "Pop in the name and phone number you used — we'll pull up your request right away!",
  portalPhoneLabel: "Mobile number",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "Show my request",
  portalLooking: "Looking…",
  portalLookupFailed: "Hmm — we couldn't find a match. Mind double-checking your name and number?",
  portalBackToLookup: "Try again",
  portalEditTitle: "Update your details",
  portalEdit: "Edit",
  portalSave: "Save changes",
  portalSaving: "Saving…",
  portalUpdateSuccessBody:
    "Got it — your updates are in! Our team will follow up if anything else is needed. Thank you!",
  portalSubmittedAt: "Submitted",
  loadingSubmission: "Loading your request…",
  loadSubmissionFailed: "Couldn't load this link. Try again or give the shop a quick call — we're happy to help!",
  expiredTitle: "This link expired",
  expiredBody:
    "This link isn't active anymore — no worries! Give the shop a quick call and we'll get you taken care of right away.",
  correctionViewTitle: "Review your request",
  correctionViewHint: "Make sure everything looks good — tap Edit if anything needs a little tweak.",
  correctionEditTitle: "Edit your request",
  correctionDoneTitle: "Update sent!",
  correctionDoneBody:
    "Thank you! The shop got your changes and will follow up during business hours.",
  correctionExpired: "This link expired or isn't valid anymore.",
  bookingPortalTitle: "Your visit",
  bookingStatusLabel: "Status",
  bookingTimeLabel: "Arrival window",
  bookingTimeHint: "Your tech arrives anytime during this window. We'll text you when we're headed your way!",
  bookingChangeTime: "Change arrival window",
  bookingEditDetails: "Update address or issue",
  bookingCancel: "Cancel visit",
  bookingRescheduleHint: "Pick a new open window below — same day blocks as when you booked.",
  bookingConfirmTime: "Confirm new window",
  bookingCancelConfirmTitle: "Cancel this visit?",
  bookingCancelConfirmBody:
    "Totally okay — we'll let the shop know. You can always call back to rebook whenever you need us!",
  bookingCancelConfirmButton: "Yes, cancel my visit",
  portalBackToView: "Back",
  portalLandingTitle: "Book with us",
  portalLandingBody:
    "Open the link from your text message to book a visit or check your arrival window.",
} as const;
