/**
 * English originals for settingsPage (연동 설정).
 * Revert: copy these values back into `settingsPage` in lib/content.ts when asked.
 */
export const SETTINGS_PAGE_EN = {
  title: "Integrations",
  subtitle: "Manage when Vowpath answers, how calls reach us, and optional Jobber sync.",
  badge: "Integrations",
  paidBadge: "Paid",
  paidWelcome:
    "You're all set on billing. Finish contact info, answer hours, and call forwarding to start getting text alerts.",
  progressTitle: "{done} of {total} required steps done",
  progressSummary: "{done} of {total} required steps done",
  progressHint:
    "Save your cell and email first, then set your hours and forwarding. Jobber is optional.",
  scrollHint: "Contact → Hours → Forwarding → Jobber (optional)",
  tocLabel: "Jump to",
  tocContact: "Contact",
  tocSchedule: "Hours",
  tocPhone: "Forwarding",
  tocJobber: "Jobber",
  stepPrefix: (n: string) => `Step ${n}`,
  prevButton: "← Back",
  tabDone: "Done",
  contactTitle: "Owner contact (required)",
  contactDescription:
    "Your US cell and email for new requests and approve/decline texts. Texts are primary; email is backup.",
  contactIntro:
    "Built for US HVAC and trades shops. Use a +1 mobile number and your main business email.",
  contactIntroKr:
    "Local dev: Korean 010 or US +1. Production is US +1 only.",
  contactEmailLabel: "Email",
  contactEmailHint: "Backup alerts and sign-in.",
  contactPhoneLabel: "Mobile number (US)",
  contactPhoneLabelKr: "Mobile number (KR test)",
  contactPhoneHint:
    "You'll get texts for new requests — reply 1 to approve, 2 to decline. e.g. (512) 555-0100",
  contactPhoneHintKr:
    "Local only: 010 format. Real SMS after Twilio upgrade. Production uses +1 only.",
  contactKrTestBanner:
    "Korean number test mode. Turn off SMS_DEV_PREVIEW after Twilio upgrade for live texts.",
  contactConfirm: "Save contact info",
  contactSaving: "Saving…",
  contactConfirmed: "Contact saved. We'll use this for text and email alerts.",
  contactLoadError: "Couldn't load your contact info. Refresh and try again.",
  contactSaveError: "Couldn't save. Check your phone and email format.",
  contactLoading: "Loading contact info…",
  smsTwilioNotReadyTitle: "Text messaging isn't ready yet",
  smsTwilioDevPreview:
    "Dev mode: no real texts sent (SMS_DEV_PREVIEW). Upgrade Twilio, verify your US number, then remove from .env.",
  contactPhoneNotUs:
    "Check the phone format. Korea: 010-XXXX-XXXX · US: (512) 555-0100",
  smsTwilioGeoHint:
    "Twilio Console → Messaging → Geo permissions → United States → Enable (error 21408)",
  contactRequiredFirst: "Save your contact info first.",
  nextContact: "Next: Contact",
  nextPhone: "Next: Forwarding",
  nextJobber: "Jobber (optional)",
  allDone:
    "You're live. Vowpath answers on your schedule and texts you when something needs a look.",
  tabOptional: "Optional",
  tabSkipped: "Skipped",
  statusDone: "Connected",
  statusPending: "Needs setup",
  manageLink: "Manage integrations",
  scheduleTitle: "Answer hours",
  scheduleDescription: "Set the days and times Vowpath should pick up, or turn on 24/7.",
  scheduleAlwaysOn: "Answer 24/7",
  scheduleAlwaysOnHint:
    "Vowpath handles every forwarded call around the clock. Match your forwarding rules to this.",
  scheduleValidation: "Turn on 24/7 or pick at least one day in a time window.",
  scheduleConfirm: "Save hours",
  scheduleConfirmed: "Hours saved",
  scheduleWindowLabel: (n: number) => `Window ${n}`,
  scheduleRemove: "Remove",
  scheduleDaysLabel: "Days",
  scheduleStartLabel: "Start",
  scheduleEndLabel: "End",
  scheduleAddWindow: "+ Add another window",
  jobberTitle: "Jobber (optional)",
  jobberDescription:
    "Connect only if you already use Jobber. You can review and approve from texts and the dashboard without it. After you reply 1, approved jobs sync as Requests in Jobber.",
  jobberConnectedSummary: "Connected: {account}",
  jobberConfirm: "Confirm connection",
  jobberConfirmHint: "After OAuth connects, tap Confirm connection.",
  jobberConfirmed: "Jobber connection saved",
  jobberSkip: "Continue without Jobber",
  jobberSkippedNote: "Jobber is skipped. You can connect anytime from here.",
  phoneTitle: "Call forwarding",
  phoneDescription:
    "Keep the number customers already know. Forward missed and after-hours calls to Vowpath — Jobber Phone / Dialpad is the smoothest path.",
  forwardingNumberLabel: "Your Vowpath number",
  forwardingNumberHint:
    "Enter this in Dialpad, your VoIP portal, or your carrier's forwarding settings. Customers still dial your main line.",
  forwardingNumberLoading: "Loading your number…",
  forwardingNumberMissing:
    "Your Vowpath number isn't connected yet. Use Developer · Twilio test below, then come back here.",
  forwardingCopy: "Copy number",
  forwardingCopied: "Copied",
  forwardingCustomerNote:
    "This is a behind-the-scenes forwarding destination — keep your public shop number on your website and Google listing.",
  forwardingScenarioTitle: "1. When should calls forward?",
  forwardingScenarioHint: "Most shops start with missed-call overflow.",
  forwardingProviderTitle: "2. What's your phone setup?",
  forwardingProviderHint:
    "We have step-by-step guides for Jobber Phone and Dialpad. Cell-carrier codes work too but vary by provider.",
  forwardingDialpadBanner:
    "Best bet: Jobber Phone or Dialpad — the steps below are built for that setup. ServiceTitan Phones Pro follows the same Dialpad flow.",
  forwardingCarrierWarning:
    "Carrier star codes differ between Verizon, AT&T, and T-Mobile. Dialpad is easier if you need reliable after-hours rules. iPhone's Call Forwarding sends every call — it can't do no-answer only.",
  forwardingStepsTitle: "3. Follow these steps",
  forwardingTestTitle: "4. Run a test call",
  forwardingTestBody:
    "Call your main shop number from another phone. Vowpath should pick up after a few rings (or right away after hours). You'll get a text summary — reply 1 to approve or 2 to pass.",
  forwardingRecommended: "Popular",
  forwardingRecommendedProvider: "Recommended",
  forwardingConfirmBlocked: "We need your Vowpath number connected before you can finish this step.",
  phoneConfirm: "Forwarding works — I've tested it",
  phoneConfirmed: "Forwarding setup complete",
  forwardingDevTitle: "Developer · Twilio test",
  forwardingDevHint:
    "For local Twilio wiring and call simulation. Live shops only need the guide above.",
  bookingPolicyTitle: "Booking policy",
  bookingPolicyMode: "Request only",
  bookingPolicyDescription:
    "Texts to your cell are how you review and approve requests. Email mirrors the same alerts. Jobber gets a Request only after you reply 1 — useful for calendar and job history.",
  bookingModeHint:
    "Auto Book: confirms after slot pick · Hybrid: auto-book selected urgencies · Manual: you approve every pick",
  shadowModeHint: "0 = real Jobber writes. 1+ = test runs without writing to Jobber.",
  ownerAlertsTitle: "How we reach you",
  ownerAlertsDescription:
    "Texts to your cell: new requests, booked visits, and reply 1 to approve · 2 to pass · 9 to undo a recent auto-book. Email is backup.",
  auditTitle: "Activity log",
  auditDescription: "Approvals, declines, and intake events from the last 30 days",
  auditEmpty: "Nothing here yet. Approve or decline a request and it'll show up.",
  auditRefresh: "Refresh",
  auditViewBooking: "View",
  opsFailuresTitle: "Recent errors",
  opsFailuresDescription:
    "Twilio, AI, Jobber, and intake failures. Duplicate errors are logged once per hour.",
  opsFailuresTwilioHint:
    "Text failed? Check Twilio geo permissions (US SMS), owner contact (+1), and trial verified numbers. Run npm run sms:diagnose in your terminal.",
  opsFailuresRetryable: "Retryable",
  opsFailuresRepeatCount: (n: number) => `${n}× same error`,
  opsFailuresClear: "Clear log",
  opsFailuresClearConfirm: "Clear all error logs for this account?",
  storageTitle: "Server storage",
  storageOk: "Storage connected",
  storageRequired: "Storage required for production",
  storageStep1: "Vercel → Storage → Create database → KV",
  storageStep2: "Link to this project (vowpath)",
  storageStep3: "Deploy → Redeploy",
  storageDocHint: "Details: KV_SETUP.md in the project root",
  backDashboard: "Back to dashboard",
  backHome: "← Back to home",
  liveBanner: "Finish contact, hours, and forwarding to go live with call answering and text alerts",
  support: "Questions? {email}",
} as const;
