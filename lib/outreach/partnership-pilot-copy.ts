import { SITE } from "@/lib/constants";

/** Co-build pilot length in outreach (adjust if offer changes). */
export const COBUILD_PILOT_WEEKS = 3;

/** Max shops per market — honest scarcity for outreach. */
export const PILOT_SLOTS_PER_STATE = 5;

/** One-line reply prompts — low friction, high intent. */
export const outreachReplyPrompts = {
  video: `Reply VIDEO — I'll send a 2-min recording of a real intake → crew text flow.`,
  try: `Reply TRY — I'll personally handle setup this week. No credit card.`,
  pass: `Reply PASS — I'll close your file. No follow-ups.`,
  either: `Reply VIDEO for the 2-min walkthrough, or TRY if you want me to set up [Shop name] this week.`,
} as const;

export const partnershipPilotCopy = {
  emailSubjects: [
    `[Shop name] — the 2am call`,
    `[First name], who catches overflow when your crew is on a job?`,
    `Lost jobs after hours — [Shop name]`,
  ] as const,

  emailSubject: `[Shop name] — the 2am call`,

  /**
   * Cold email — pain, credibility, founder hands-on, easy reply.
   * Personalize: [First name], [Shop name], [City/state], optional [review/ detail].
   */
  emailBody: `Hi [First name],

I'll be direct — I'm not a vendor blasting a list. I'm Min, founder of Effiroad, and I'm looking for ${PILOT_SLOTS_PER_STATE} independent restoration shops in [State] to run a short pilot with me.

One question I keep hearing from owners: when a homeowner calls at 2am with a burst pipe and your crew is already on a job — who answers, and how fast does someone get dispatched?

Most shops lose 1–2 emergency jobs a month to voicemail or a slow callback. At your ticket size, that's real money — and the caller usually dials the next company on Google.

Effiroad is built for that exact gap:
• Answers as [Shop name] — not a generic call center
• Runs loss intake (type, address, insurance) in ~60 seconds
• Clear standard water → texts your on-call crew to move
• Fire, structure, or sewage → texts YOU first (1 = go, 2 = pass)
• You keep your Google number. No CRM swap.

I'm offering ${COBUILD_PILOT_WEEKS} weeks free. I set up forwarding myself — about 10 minutes of your time. No credit card. If it's not saving you headaches by week 2, shut it off — no invoice, no awkward call.

Shops that stay and give me honest feedback (what's broken, what's missing) lock ${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years instead of ${SITE.betaLockedPrice}/mo — and get first access when we ship the mobile app. I'm building that with pilot shops, not in a vacuum.

I'm not trying to sign 500 accounts. I need a few owners who will tell me the truth.

${outreachReplyPrompts.either}

— Min
Founder, Effiroad
${SITE.url}`,

  /** SMS — human, urgent, professional. Fits one phone screen. */
  sms: `[First name] — Min, founder of Effiroad.

Honest question: when a 2am water call hits [Shop name] and your crew is tied up — who answers today?

I built an AI intake + crew text layer for independent restoration shops (you keep your number). Looking for ${PILOT_SLOTS_PER_STATE} shops in [State] for a ${COBUILD_PILOT_WEEKS}-week free pilot — I do setup, no card, stop anytime.

Reply VIDEO (2-min demo) or TRY (setup this week).`,

  linkedInConnect: `[First name] — I built Effiroad for independent restoration shops (after-hours intake + crew dispatch). Running a small pilot in [State] — would value connecting with an owner who lives this problem daily.`,

  linkedInDm: `Thanks for connecting, [First name].

I'm Min — founder of Effiroad. I'm personally onboarding ${PILOT_SLOTS_PER_STATE} restoration shops in [State] for a ${COBUILD_PILOT_WEEKS}-week pilot.

The problem I'm solving: overflow and after-hours calls that hit voicemail while your crew is on a job — and the homeowner calls Servpro next.

Effiroad answers as your shop, captures the loss, and texts your on-call crew. Fire/sewage waits for your approval. You keep your number.

No pitch deck — happy to send a 2-min screen recording or jump on a 10-min call. Either way, I'll tell you straight if I don't think it's a fit for [Shop name].

Reply VIDEO or TRY?`,

  /** After they reply VIDEO — send with Loom link */
  videoCoverNote: `Hi [First name] — as promised, 2 minutes start to finish: homeowner call → intake → crew text → your dashboard.

Watch when you have a minute. If it matches how [Shop name] actually runs jobs, reply TRY and I'll block time to set up forwarding — usually 10 min on your end.

If it's not relevant, reply PASS and I won't bug you again.

— Min`,

  followUpNoReply: `[First name] — Min again. One bump, then I'll leave you alone.

Still have 2 pilot slots open in [State]. ${COBUILD_PILOT_WEEKS} weeks free, I handle setup, no card. Built specifically for owner-operators who miss calls when the crew is already on a job.

Worth 2 minutes? Reply VIDEO.
Ready to test? Reply TRY.
Not for you? Reply PASS — respect that.

— Min`,

  followUpInterested: `[First name] — good to hear.

Here's what happens next if you reply TRY:
1. 10-min call — I learn how [Shop name] routes after-hours today
2. I configure Effiroad and test with you (same day or next)
3. You run it ${COBUILD_PILOT_WEEKS} weeks free and tell me what's wrong

No contract. No card. If your crew hates it, we turn it off.

What day works for a quick setup call?

— Min`,

  followUpLast: `[First name] — last note.

If after-hours is already locked down at [Shop name], ignore this.

If it's still a gap: I'll set up the pilot myself, free, and you judge it on real calls — not a slide deck.

Reply TRY this week, or PASS and I'm gone.

— Min
Founder, Effiroad`,

  /** When they reply TRY — immediate scheduling */
  tryReplyTemplate: `Perfect — let's do it.

Two options:
• Reply with a time that works (I'm flexible on [timezone] mornings/evenings)
• Or book here: [calendar link if you have one]

I'll need ~10 min + your after-hours routing preference. I handle the rest.

— Min`,

  emailBodyKo: `[업체명] [First name]님,

장황한 세일즈 메일 아닙니다. Effiroad 만든 Min입니다. [주/지역] independents 복구 업체 ${PILOT_SLOTS_PER_STATE}곳만 직접 파일럿합니다.

자주 듣는 질문: 크루가 현장에 있는데 새벽 2시에 파이프 터졌다고 전화 오면 — 누가 받고, 얼마나 빨리 출동하나요?

 voicemail / 늦은 콜백 한 달에 1–2건이면, 티켓 한 번 값이면 충분히 아깝습니다. 보통 다음 업체로 전화합니다.

Effiroad:
• [Shop name] 이름으로 응대 (콜센터 톤 아님)
• 손실 정보 ~60초 수집
• 일반 누수 → 온콜 크루 문자
• 화재/오염 → 업주 승인 후 (1=go, 2=pass)
• Google 번호 유지, CRM 교체 없음

${COBUILD_PILOT_WEEKS}주 무료. 포워딩 세팅은 제가 직접 (~10분). 카드 없음. 2주차까지 도움 안 되면 끄면 됩니다.

솔직한 피드백 주시면 ${SITE.betaIntroPrice}/월 ${SITE.betaDiscountYears}년 고정 (정가 ${SITE.betaLockedPrice}). 앱도 파일럿 업체 의견 반영.

500곳 늘리려는 게 아니라, 진짜 말해줄 오너 몇 분 필요합니다.

답장: VIDEO (2분 데모) / TRY (이번 주 세팅) / PASS

— Min
${SITE.url}`,

  /** Founder voice checklist — read before sending */
  sendChecklist: [
    "Replace [First name], [Shop name], [State] — never send generic",
    "Optional: one line from their Google review or website (shows you looked)",
    "Send Tue–Thu, 8–10am their local time",
    "If they reply VIDEO, send Loom within 1 hour",
    "If they reply TRY, offer 2 specific times same day",
  ] as const,
} as const;

export const outreachQuickSend = {
  sms: partnershipPilotCopy.sms,
  email: partnershipPilotCopy.emailBody,
  bump: partnershipPilotCopy.followUpNoReply,
  videoCover: partnershipPilotCopy.videoCoverNote,
  tryReply: partnershipPilotCopy.tryReplyTemplate,
} as const;
