/**
 * English originals for settingsPage (연동 설정).
 * Revert: copy these values back into `settingsPage` in lib/content.ts when asked.
 */
export const SETTINGS_PAGE_EN = {
  title: "Integrations",
  subtitle: "Manage when Effiroad answers, how calls reach us, and optional Jobber sync.",
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
    "You're live. Effiroad answers on your schedule and texts you when something needs a look.",
  tabOptional: "Optional",
  tabSkipped: "Skipped",
  statusDone: "Connected",
  statusPending: "Needs setup",
  manageLink: "Manage integrations",
  scheduleTitle: "Answer hours",
  scheduleDescription: "Set the days and times Effiroad should pick up, or turn on 24/7.",
  scheduleAlwaysOn: "Answer 24/7",
  scheduleAlwaysOnHint:
    "Effiroad handles every forwarded call around the clock. Match your forwarding rules to this.",
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
    "Retain your existing company number. Missed and after-hours calls forward automatically to Effiroad — Jobber Phone and Dialpad provide the most seamless configuration.",
  forwardingNumberLabel: "Your dedicated Effiroad number",
  forwardingNumberHint:
    "Set this as the forwarding destination in Dialpad, your VoIP admin portal, or your carrier's call routing settings. Your main shop number remains unchanged for customers.",
  forwardingNumberLoading: "Retrieving your number…",
  forwardingNumberMissing:
    "Your Effiroad receive number has not been provisioned yet. Contact support or use the provisioning option below.",
  forwardingCopy: "Copy number",
  forwardingCopied: "Copied",
  forwardingCustomerNote:
    "This number is a behind-the-scenes routing destination — your public-facing shop number stays unchanged on your website, Google Business Profile, and truck signage.",
  forwardingWhatYouAreSetting: "What you are setting up",
  forwardingProviderTitle: "Pick your phone system",
  forwardingProviderHint:
    "Only verified paths are shown. Follow every numbered step on the right phone or portal — Effiroad cannot turn on forwarding remotely.",
  forwardingDialpadBanner:
    "Recommended if you use Jobber Phone or Dialpad — set When unanswered → external number in the Dialpad web app (not a phone star code).",
  forwardingUnblockTitle: "If something blocks you — alternate paths",
  forwardingUnblockHint:
    "Pick the situation that matches your phone. These are verified workarounds when the main steps fail (prepaid, business line, voicemail, missing app menu).",
  forwardingCarrierCallLabel: "Carrier support:",
  forwardingVerizonWarning:
    "Verizon: try the *71 dial button first, then My Verizon. Never *72 or iPhone Settings → Call Forwarding (forwards every call).",
  forwardingGoogleVoiceWarning:
    "Google Voice cannot reliably ring your cell first, then Effiroad after ~20 seconds. For true overflow, pick your cell carrier above — or use Effiroad dedicated number (simplest, always works).",
  forwardingQuiz: {
    badge: "Step 1 · Find your path",
    title: "Where do customer calls go today?",
    subtitle: "Three quick answers — we show one verified guide (no guessing).",
    q1Label: "1. Customers dial which number?",
    q1ShopCell: "My shop cell phone",
    q1BusinessVoip: "Business phone system (Dialpad, Jobber, ServiceTitan, RingCentral…)",
    q1GoogleVoice: "Google Voice number",
    q1Unsure: "Not sure — show me the simplest option",
    q2CarrierLabel: "2. Which mobile carrier?",
    q2Att: "AT&T / Cricket / Straight Talk",
    q2Tmobile: "T-Mobile / Metro / Mint",
    q2Verizon: "Verizon Wireless",
    q2Xfinity: "Xfinity Mobile",
    q2VoipLabel: "2. Which phone system?",
    q2Dialpad: "Dialpad / Jobber Phone / ServiceTitan Phones Pro",
    q2Ringcentral: "RingCentral",
    q2Grasshopper: "Grasshopper",
    q3Label: "3. How should Effiroad answer?",
    q3Overflow: "Keep my current number — forward when I miss a call",
    q3OverflowHint: "Your phone rings first (~20 sec), then Effiroad.",
    q3Dedicated: "Use my Effiroad dedicated number as the main line",
    q3DedicatedHint: "No carrier codes. Put Effiroad on Google, website, and trucks.",
    gvOverflowWarning:
      "Google Voice rarely supports “ring my cell, then Effiroad.” We strongly recommend Effiroad dedicated number — or pick your cell carrier in question 1 instead.",
    pathReady: "Path selected — follow the guide below.",
    showGuide: "Show my guide",
    back: "← Back",
  },
  forwardingChangePath: "← Pick a different setup path",
  forwardingPathPicker: {
    badge: "Choose your setup",
    title: "Three ways to forward your line",
    subtitle:
      "Start with overflow or VoIP routing — keep your Google number. If forwarding won't work on your plan, use your Effiroad dedicated number below (same AI quality).",
    bestBadge: "Easiest",
    pickCarrier: "Which carrier is your shop cell on?",
    pickVoip: "Which business phone system?",
    back: "← Back to all paths",
    quizFallback: "Not sure? Answer 3 quick questions instead",
    overflowFallbackHint:
      "Can't set up forwarding on this carrier? Use your Effiroad dedicated number — same AI voice, same intake, no star codes.",
    cardFallbackLine: "Forwarding blocked? → Effiroad dedicated number (same quality)",
    dedicatedFallbackTitle: "If forwarding isn't possible, use your Effiroad number",
    dedicatedEqualQuality:
      "Not a downgrade — customers call Effiroad directly and get the same natural voice, polite intake, and dispatch rules as overflow forwarding.",
    paths: {
      dedicated_line: {
        title: "Effiroad dedicated number",
        description: "No carrier codes. Put our number on Google, website, and trucks — test in 10 minutes.",
      },
      cell_overflow: {
        title: "Keep your cell — one-tap overflow",
        description: "Your shop phone rings first. Miss it → Effiroad. AT&T, T-Mobile, Verizon, or Xfinity.",
      },
      business_voip: {
        title: "Jobber Phone / Dialpad / RingCentral",
        description: "Set unanswered or Fallback routing to Effiroad in your VoIP admin portal.",
      },
      google_voice: {
        title: "Google Voice forward",
        description: "Best when GV is your main line. Overflow to your cell is unreliable — see warning below.",
      },
      quiz: {
        title: "Help me choose",
        description: "Three questions to find your path.",
      },
    },
  },
  forwardingAlternatePaths: {
    title: "If this path fails, try next:",
    hint: "When every forwarding option fails, switch to your Effiroad dedicated number — same call quality, no carrier codes.",
    dedicatedLabel: "★ Effiroad dedicated (same quality)",
  },
  forwardingChangeProvider: "Different phone setup?",
  forwardingDedicatedLine: {
    badge: "Effiroad dedicated number",
    title: "Same quality as forwarding — no codes required",
    body: "Customers call your Effiroad number directly. Same natural AI voice, same polite intake, same dispatch rules — just without carrier star codes or VoIP admin menus.",
    fallbackBadge: "Forwarding not working?",
    fallbackTitle: "Use your Effiroad dedicated number instead",
    fallbackBody:
      "Tried every forwarding path and the test still fails? Publish your Effiroad number on Google, your website, and trucks. Callers get the exact same experience — many shops prefer this.",
    switchButton: "Use Effiroad dedicated number — show me how",
    footer: "Your old shop number can stay on personal contacts until Google and signage are updated.",
    equalQualityNote:
      "Same AI call quality as overflow forwarding — natural conversation, complete intake, and dispatch while the customer waits.",
    features: [
      "Same professional voice and intake as forwarding — not a lesser option.",
      "No star codes, no Dialpad admin — customers dial Effiroad directly.",
      "Answer Hours control when AI picks up vs. when your cell rings.",
      "Works on prepaid, business lines, and Google Voice — no forwarding limits.",
      "Update Google Business Profile once, then test by calling the Effiroad number.",
    ] as const,
  },
  forwardingDialpadVisual: {
    caption: "Dialpad · ServiceTitan Main Line (30 sec overview)",
    hint: "Fallback Options → external number → paste Effiroad → Closed Hours too.",
    stepLabel: (n: number) => `Step ${n}`,
  },
  forwardingTestFailedDedicated:
    "Test still failing after every step? Use your Effiroad dedicated number instead — no forwarding required.",
  forwardingStepsTitle: "Step-by-step (follow in order)",
  forwardingTestTitle: "Test call",
  forwardingTestBody:
    "Tap Start test below, then call your main shop number from another phone. Let it ring without answering — we detect when Effiroad receives the forwarded call.",
  forwardingTestBodyDirect:
    "Tap Start test below, then call your Effiroad number from another phone. No forwarding needed — Effiroad should answer per your Answer Hours.",
  forwardingVerifyCallEffiroad: "Call this Effiroad number:",
  forwardingVerifyWaitingDirect: "Waiting — call your Effiroad number now from another phone",
  forwardingOneTapTitle: "Quick actions on your phone",
  forwardingOneTapHint:
    "AT&T / T-Mobile only: on the shop cell, tap Dial code, wait for confirmation, then check Done. Dialpad and Verizon use the portal/app buttons instead.",
  forwardingTapToActivate: "Tap to activate on this phone",
  forwardingCopyNumber: "Copy Effiroad number",
  forwardingTurnOff: "Turn off this rule",
  forwardingStepDone: "Done — I tapped this",
  forwardingOneTapComplete: "Setup steps marked done. Continue to Test call.",
  forwardingOneTapProgress: "Check each step after you tap — then go to Test call.",
  forwardingVerifyStart: "Start forwarding test",
  forwardingVerifyListening: "Listening for your test call…",
  forwardingVerifyWaiting: "Waiting — call your shop number now from another phone",
  forwardingVerifyCallShop: "Call this number (your shop line):",
  forwardingVerifyNotEffiroad: "Do not call the Effiroad routing number:",
  forwardingVerifySuccess: "Forwarding works — Effiroad received your test call.",
  forwardingVerifySuccessInboundOnly:
    "Effiroad received a call. We could not confirm it came through your shop line — call your shop number (not Effiroad) and let it ring without answering.",
  forwardingVerifyWrongForward:
    "A call arrived but the carrier reported a different forwarding source. Check that you dialed the code on your shop phone and that your shop number matches Contact settings.",
  forwardingVerifyError: "Could not start the test. Try again.",
  forwardingVerifyRequired: "Complete the forwarding test above before confirming.",
  forwardingRecommended: "Recommended",
  forwardingRecommendedProvider: "Recommended",
  forwardingConfirmBlocked: "A provisioned Effiroad number is required to complete this step.",
  phoneConfirm: "Confirm — forwarding verified",
  phoneConfirmed: "Call forwarding configured",
  forwardingDevTitle: "Developer · Twilio test",
  forwardingDevHint:
    "For local Twilio wiring and call simulation. Live shops only need the guide above.",
  bookingPolicyTitle: "Booking policy",
  bookingPolicyMode: "Request only",
  bookingPolicyDescription:
    "Texts to your cell are how you review and approve requests. Email mirrors the same alerts. Jobber gets a Request only after you reply 1 — useful for calendar and job history.",
  bookingModeHint:
    "Smart auto-book: routine P2/P3 confirm instantly · P1 or unclear intakes wait for your 1 / 2",
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
  storageStep2: "Link to this project (effiroad)",
  storageStep3: "Deploy → Redeploy",
  storageDocHint: "Details: KV_SETUP.md in the project root",
  backDashboard: "Back to dashboard",
  backHome: "← Back to home",
  liveBanner: "Finish contact, hours, and forwarding to go live with call answering and text alerts",
  support: "Questions? {email}",
} as const;
