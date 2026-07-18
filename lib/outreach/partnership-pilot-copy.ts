import { SITE } from "@/lib/constants";

/** Co-build pilot length in outreach (adjust if offer changes). */
export const COBUILD_PILOT_WEEKS = 3;

/** One-line reply prompts — paste at the end of any message. */
export const outreachReplyPrompts = {
  video: `Reply "VIDEO" and I'll send a 2-min screen recording.`,
  try: `Reply "TRY" and I'll get you set up this week — no credit card.`,
  pass: `Not interested? Reply "PASS" — no hard feelings.`,
  either: `Reply "VIDEO" for a 2-min demo or "TRY" to start the free pilot.`,
} as const;

export const partnershipPilotCopy = {
  /** Pain-led subject lines — pick one */
  emailSubjects: [
    `[Shop name] — after-hours calls`,
    `[First name], quick question about 2am jobs`,
    `[Shop name] — who picks up when your crew is busy?`,
  ] as const,

  emailSubject: `[Shop name] — after-hours calls`,

  /** Cold email — pain first, one CTA, easy reply */
  emailBody: `Hi [First name],

Quick question: when a homeowner calls [Shop name] at 2am with a burst pipe, what happens if no one's free to pick up?

I'm Min — running a small early-partner pilot with independent restoration shops. Effiroad answers after-hours calls, captures loss details, and texts your crew. Clear water can auto-dispatch; fire or sewage waits for your OK first. You keep your Google number. No CRM.

Offer for pilot shops:
• ${COBUILD_PILOT_WEEKS}-week free pilot — I handle setup (~10 min on your end)
• No credit card — stop anytime if it's not a fit
• Share feedback → lock in ${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years (regular ${SITE.betaLockedPrice}/mo)
• Your input shapes the mobile app we're building next

${outreachReplyPrompts.either}

— Min
${SITE.url}`,

  /** SMS / LinkedIn DM — 3 lines max + reply keyword */
  sms: `Hi [First name] — Min from Effiroad. When you're on a job and a 2am water call comes in, who answers?

${COBUILD_PILOT_WEEKS}-week free pilot for a few restoration shops — AI intake + crew texts, keep your number. No card, stop anytime.

Reply VIDEO for a 2-min demo or TRY to start.`,

  /** LinkedIn connection note (300 char limit friendly) */
  linkedInConnect: `Hi [Name] — I work with independent restoration shops on after-hours call handling. Running a small free pilot — would love to connect. No pitch unless it's useful.`,

  /** LinkedIn DM after connect */
  linkedInDm: `Thanks for connecting, [First name].

One question: when a 2am water call comes in and your crew is tied up — who catches it today?

I'm piloting Effiroad with a few shops: AI answers, captures the loss, texts your crew. ${COBUILD_PILOT_WEEKS} weeks free, I do setup, no card.

Reply here or text me — happy to send a 2-min video.`,

  /** Follow-up — day 3, no reply */
  followUpNoReply: `Hi [First name] — bumping this once.

Still offering the ${COBUILD_PILOT_WEEKS}-week free pilot for [Shop name] — after-hours AI intake + crew texts, you keep your number. No credit card, stop anytime.

${outreachReplyPrompts.either}

— Min`,

  /** Follow-up — after they watched demo / showed interest */
  followUpInterested: `Hi [First name] — glad it looked useful.

Next step is simple: I set up forwarding (~10 min), you test for ${COBUILD_PILOT_WEEKS} weeks free, and tell me what's broken or missing. Not a fit? Stop — no charge.

Reply "TRY" to pick a setup time, or "QUESTION" if something's unclear.

— Min`,

  /** Follow-up — last touch */
  followUpLast: `Hi [First name] — last note from me.

If after-hours calls are already handled, ignore this. If it's still on the list, the pilot is free and takes ~10 min to set up.

Reply "TRY" this week or "PASS" and I won't follow up again.

— Min`,

  /** Korean reference for founder (not sent to US shops) */
  emailBodyKo: `[업체명] [First name]님, 안녕하세요.

한 가지만 여쭤볼게요 — 새벽 2시에 파이프 터졌다고 전화 오면, 지금 크루가 현장에 있을 때 누가 받으세요?

저는 Min이고, Effiroad early-partner 파일럿을 소규모로 진행 중입니다. 야간/바쁠 때 AI가 전화 받고 → 손실 정보 수집 → 크루에게 문자. 일반 누수는 자동 디스패치, 화재/오염은 업주 승인 후 진행. Google 번호 그대로 씁니다.

• ${COBUILD_PILOT_WEEKS}주 무료 — 세팅은 제가 도와드림 (업체 쪽 ~10분)
• 카드 없음 — 마음에 안 들면 중간에 그만
• 피드백 주시면 ${SITE.betaIntroPrice}/월 ${SITE.betaDiscountYears}년 고정 (정가 ${SITE.betaLockedPrice})
• 앱 출시 시 파일럿 업체 의견 반영

답장: "VIDEO" → 2분 데모 영상 / "TRY" → 이번 주 세팅

— Min
${SITE.url}`,
} as const;

/** Copy-paste blocks for fast outreach from phone */
export const outreachQuickSend = {
  sms: partnershipPilotCopy.sms,
  email: `${partnershipPilotCopy.emailBody}`,
  bump: partnershipPilotCopy.followUpNoReply,
} as const;
