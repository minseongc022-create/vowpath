import { SITE } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/billing-cohort";

/** Matches signup trial in product — keep outreach aligned with billing-cohort.ts */
export const OUTREACH_TRIAL_DAYS = TRIAL_DAYS;

export const outreachReplyPrompts = {
  video: `Reply VIDEO — I'll send a 2-min recording: caller → intake → crew text.`,
  try: `Reply TRY — I'll configure [Shop name] this week. No credit card required.`,
  pass: `Reply PASS — I'll close the file.`,
} as const;

/**
 * Outreach copy — fact-checked against product (loss-category dispatch, forwarding, trial).
 * Personalize: [First name], [Shop name], [City], [State] + one detail from their listing.
 */
export const partnershipPilotCopy = {
  emailSubjects: [
    `[Shop name] — after-hours dispatch`,
    `[First name] — who owns the 2am call?`,
    `Quick ops question — [Shop name]`,
  ] as const,

  emailSubject: `[Shop name] — after-hours dispatch`,

  emailBody: `Hi [First name],

When a homeowner calls [Shop name] at 2am with a burst pipe — and your crew is already on a job — what happens in the first 60 seconds?

If the answer is voicemail or "call back in the morning," that job usually goes to whoever picks up next on Google.

I'm Min, founder of Effiroad. We built an after-hours intake and dispatch layer for independent restoration shops — not a generic answering service.

How it runs on a live call:
• Greets as [Shop name]
• Captures loss type, address, and insurance details on the call
• Clear standard water loss with complete info → texts your on-call crew to move
• Fire, sewage, commercial, or unclear intake → texts you for approval first (reply 1 = go, 2 = pass)
• Customers still dial your shop number — unanswered/after-hours calls forward to Effiroad. No CRM migration.

Answering services take a message. This runs intake and dispatch while the caller is still on the line.

${OUTREACH_TRIAL_DAYS}-day free trial for shops in [City]/[State]. I handle configuration — about ten minutes on your end. No credit card to start. Test on real calls and decide from outcomes.

${outreachReplyPrompts.video}
${outreachReplyPrompts.try}

— Min
Effiroad
${SITE.url}`,

  sms: `[First name] — Min, Effiroad.

When a 2am water call hits [Shop name] and your crew is on a job — does someone answer and dispatch, or does it hit voicemail?

After-hours intake + crew texting for restoration shops. Answers as your shop. Clear water w/ complete info → crew text. Fire/sewage/unclear → your approval first. Your number forwards — customers still dial you.

${OUTREACH_TRIAL_DAYS}-day free trial, no card. Reply VIDEO or TRY.`,

  linkedInConnect: `[First name] — built Effiroad for independent restoration after-hours intake and crew dispatch. Would value connecting with an owner in [State].`,

  linkedInDm: `[First name] — thanks for connecting.

When overflow or after-hours calls hit [Shop name] while your crew is tied up — what's your process today?

Effiroad answers as your shop, runs loss intake, and texts your on-call crew. Fire and sewage wait for your approval. Your shop number stays on Google — calls forward when you can't pick up.

${OUTREACH_TRIAL_DAYS}-day free trial, no card. Reply VIDEO for a 2-min recording or TRY to go live this week.

— Min`,

  videoCoverNote: `[First name] — recording attached. Two minutes: caller → intake → crew text → your dashboard.

If this matches how [Shop name] should handle after-hours, reply TRY and I'll get call forwarding configured — about ten minutes on your side.

If not a fit, reply PASS.

— Min`,

  followUpNoReply: `[First name] — following up once.

Still offering a ${OUTREACH_TRIAL_DAYS}-day free trial for [Shop name]: after-hours intake, crew texts, call forwarding from your existing number. I handle setup.

Reply VIDEO for the 2-min flow.
Reply TRY to run it live this week.
Reply PASS to close the file.

— Min`,

  followUpInterested: `[First name] — good.

Next step: a short setup call. I learn how [Shop name] routes after-hours today, configure forwarding, and you test on real traffic for ${OUTREACH_TRIAL_DAYS} days.

Reply with two times that work this week, or say TRY and I'll send options.

— Min`,

  followUpLast: `[First name] — last note from my side.

If after-hours is already covered at [Shop name], no action needed.

If it's still a gap, reply TRY and I'll configure the trial. Reply PASS and I won't follow up again.

— Min
Effiroad`,

  tryReplyTemplate: `[First name] — let's lock it in.

I can do setup:
• [Day/time option 1]
• [Day/time option 2]

Reply with either, or send what works for you. I'll need ~10 minutes and your after-hours routing preference.

— Min`,

  postPilotTransition: `[First name] — your free trial ends [date].

If Effiroad is handling calls the way you want, we'll move you to a standard plan — details at ${SITE.url}/pricing.

If you want changes before committing, reply here and we'll adjust dispatch rules or timing first.

— Min`,

  emailBodyKo: `[First name]님, [Shop name]

새벽 2시 파이프 터짐 — 크루가 현장에 있을 때, 첫 60초에 누가 받고 출동까지 연결하나요?

Effiroad — 독립 복구 업체용 야간 intake + 크루 디스패치.
• [Shop name] 이름으로 응대
• 손실 유형·주소·보험 정보 수집
• 명확한 일반 누수(정보 완비) → 온콜 크루 문자
• 화재·오염·불명확 intake → 업주 승인 후 (1=go, 2=pass)
• 고객은 기존 번호로 전화 → 못 받을 때 Effiroad로 forwarding. CRM 이전 없음

${OUTREACH_TRIAL_DAYS}일 무료 trial. 세팅 ~10분. 카드 없음.

답장: VIDEO / TRY / PASS

— Min
${SITE.url}`,

  /** Factual claims verified in codebase — do not over-promise beyond this */
  productFacts: {
    trialDays: OUTREACH_TRIAL_DAYS,
    noCreditCardAtSignup: true,
    dispatchPolicy:
      "Clear P1 water with complete intake → crew notified; fire/sewage_cat3/commercial/ambiguous → owner approval",
    numberModel: "Shop number stays published; unanswered/after-hours calls forward to Effiroad",
    setupMinutes: 10,
    crmRequired: false,
  } as const,

  sendChecklist: [
    "Fill [First name], [Shop name], [City], [State] — every send",
    "Add one specific detail (review, service area, specialty) when possible",
    "Send Tue–Thu, 8–10am shop local time",
    "VIDEO reply → Loom within 1 hour",
    "TRY reply → two concrete time slots same message",
    "Say 14-day trial (not 3 weeks) unless you manually extend in billing",
    "Say call forwarding — not that the number itself changes",
  ] as const,
} as const;

export const outreachQuickSend = {
  sms: partnershipPilotCopy.sms,
  email: partnershipPilotCopy.emailBody,
  bump: partnershipPilotCopy.followUpNoReply,
  last: partnershipPilotCopy.followUpLast,
  videoCover: partnershipPilotCopy.videoCoverNote,
  tryReply: partnershipPilotCopy.tryReplyTemplate,
} as const;
