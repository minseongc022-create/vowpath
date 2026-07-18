import { SITE } from "@/lib/constants";

/** Public evaluation window referenced in outreach. */
export const COBUILD_PILOT_WEEKS = 3;

export const outreachReplyPrompts = {
  video: `Reply VIDEO — I'll send a 2-min recording: caller → intake → crew text.`,
  try: `Reply TRY — I'll configure [Shop name] this week. No credit card required.`,
  pass: `Reply PASS — I'll close the file.`,
} as const;

/**
 * Final outreach copy — confident, restoration-specific, reply-ready.
 * Personalize every send: [First name], [Shop name], [City], [State].
 * Optional: one line from their Google listing or reviews.
 *
 * Do NOT include internal roadmap, cohort mechanics, or slot counts in customer copy.
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

I'm Min, founder of Effiroad. We built an after-hours intake and dispatch layer specifically for independent restoration shops — not a generic answering service.

How it runs on a live call:
• Greets as [Shop name]
• Captures loss type, address, and insurance in about a minute
• Standard water loss → texts your on-call crew to move
• Fire, structure, or sewage → holds and texts you for approval before anything dispatches
• Your published number stays the same. No CRM migration.

Answering services take a message. This captures the job and gets your crew moving while the caller is still on the line.

I'm opening a ${COBUILD_PILOT_WEEKS}-week evaluation for shops in [City]/[State]. I handle configuration on my end — roughly ten minutes of yours. No credit card to start. Run it on real calls and decide off outcomes, not a slide deck.

${outreachReplyPrompts.video}
${outreachReplyPrompts.try}

— Min
Effiroad
${SITE.url}`,

  sms: `[First name] — Min, Effiroad.

When a 2am water call hits [Shop name] and your crew is on a job — does someone answer and dispatch, or does it hit voicemail?

We built after-hours intake + crew texting for independent restoration shops. Answers as your shop. Standard water → crew text. Fire/sewage → your approval first. Same Google number.

${COBUILD_PILOT_WEEKS}-week evaluation — I handle setup. Reply VIDEO or TRY.`,

  linkedInConnect: `[First name] — built Effiroad for independent restoration after-hours intake and crew dispatch. Would value connecting with an owner in [State].`,

  linkedInDm: `[First name] — thanks for connecting.

Direct question: when overflow or after-hours calls hit [Shop name] while your crew is tied up, what's your process today?

Effiroad answers as your shop, runs loss intake, and texts your on-call crew — with hold rules on fire and sewage. Same number. No CRM swap.

Happy to send a 2-min recording of the full flow. Reply VIDEO if you want to see it, or TRY if you want it live on [Shop name] this week.

— Min`,

  videoCoverNote: `[First name] — recording attached. Two minutes: caller → intake → crew text → your dashboard.

If this matches how [Shop name] should handle after-hours, reply TRY and I'll get forwarding configured — about ten minutes on your side.

If not a fit, reply PASS.

— Min`,

  followUpNoReply: `[First name] — following up once.

Still offering the ${COBUILD_PILOT_WEEKS}-week evaluation for [Shop name]: after-hours intake, crew texts, your number unchanged. I handle setup.

Reply VIDEO for the 2-min flow.
Reply TRY to run it live this week.
Reply PASS to close the file.

— Min`,

  followUpInterested: `[First name] — good.

Next step: a short setup call. I learn how [Shop name] routes after-hours today, configure Effiroad, and you test on real traffic for ${COBUILD_PILOT_WEEKS} weeks.

Reply with two times that work for you this week, or say TRY and I'll send options.

— Min`,

  followUpLast: `[First name] — last note from my side.

If after-hours is already covered at [Shop name], no action needed.

If it's still a gap, reply TRY and I'll configure the evaluation. Reply PASS and I won't follow up again.

— Min
Effiroad`,

  tryReplyTemplate: `[First name] — let's lock it in.

I can do setup:
• [Day/time option 1]
• [Day/time option 2]

Reply with either, or send what works for you. I'll need ~10 minutes and your after-hours routing preference.

— Min`,

  /** After evaluation — transition to paid (no internal cohort details) */
  postPilotTransition: `[First name] — your evaluation window wraps up [date].

If Effiroad is handling calls the way you want, we'll move you to a standard plan — details at ${SITE.url}/pricing.

If you want changes before committing, reply here and we'll adjust dispatch rules or timing first.

— Min`,

  emailBodyKo: `[First name]님, [Shop name]

새벽 2시 파이프 터짐 전화 — 크루가 현장에 있을 때, 첫 60초에 누가 받고 출동까지 연결하나요?

 voicemail이면 보통 Google 다음 업체로 갑니다.

Effiroad — 독립 복구 업체용 야간 intake + 크루 디스패치입니다.
• [Shop name] 이름으로 응대
• 손실 유형·주소·보험 ~1분 수집
• 일반 누수 → 온콜 크루 문자
• 화재·오염 → 업주 승인 후 진행
• 공개 번호 유지, CRM 이전 없음

${COBUILD_PILOT_WEEKS}주 evaluation — 세팅은 제가 처리 (~10분). 카드 없이 시작.

답장: VIDEO (2분 영상) / TRY (이번 주 세팅) / PASS

— Min
${SITE.url}`,

  sendChecklist: [
    "Fill [First name], [Shop name], [City], [State] — every send",
    "Add one specific detail (review, service area, specialty) when possible",
    "Send Tue–Thu, 8–10am shop local time",
    "VIDEO reply → Loom within 1 hour",
    "TRY reply → two concrete time slots same message",
    "Never mention internal pricing cohorts, slot counts, or roadmap details",
  ] as const,
} as const;

/** Copy-paste blocks for phone / inbox */
export const outreachQuickSend = {
  sms: partnershipPilotCopy.sms,
  email: partnershipPilotCopy.emailBody,
  bump: partnershipPilotCopy.followUpNoReply,
  last: partnershipPilotCopy.followUpLast,
  videoCover: partnershipPilotCopy.videoCoverNote,
  tryReply: partnershipPilotCopy.tryReplyTemplate,
} as const;
