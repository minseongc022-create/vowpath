import { SITE } from "@/lib/constants";

/** Public evaluation window referenced in outreach. */
export const COBUILD_PILOT_WEEKS = 3;

export const outreachReplyPrompts = {
  video: `Reply VIDEO — I'll send a 2-min walkthrough.`,
  try: `Reply TRY — start a ${COBUILD_PILOT_WEEKS}-week free run on [Shop name]. No credit card.`,
  pass: `Reply PASS — I'll close the file.`,
} as const;

/**
 * Outreach copy — warm, founder-to-owner, collaborative (not salesy).
 * Personalize every send: [First name], [Shop name], [City], [State].
 * Do NOT quote dollar amounts in cold email — pricing lives on the site.
 */
export const outreachPilotDisclaimer =
  "Effiroad is a best-effort tool — you stay in control of dispatch and customer decisions. No guaranteed pickup or SLA during the free run. Cancel anytime. Reply PASS to opt out.";

export const partnershipPilotCopy = {
  emailSubjects: [
    `Would love your take — building this with shop owners in [State]`,
    `[First name] — after-hours calls at [Shop name]`,
    `Quick question about missed calls in [City]`,
  ] as const,

  emailSubject: `Would love your take — building this with shop owners in [State]`,

  emailBody: `Hi [First name],

I'm building Effiroad with independent restoration owners — and I'd love [Shop name]'s perspective if after-hours calls are still a gap.

When your crew is on a job and a homeowner calls at 2am, someone still has to answer. Voicemail usually means the next shop on Google gets the work.

That's what Effiroad handles: it answers as [Shop name], runs intake on the call, and texts your on-call crew on standard water jobs. Fire, sewage, or anything unclear waits on your OK first. Your Google number stays the same — no CRM swap.

Before anything else, ${SITE.url} has a short interactive demo of the call flow. Tap through it — about a minute, no signup.

I'm opening a ${COBUILD_PILOT_WEEKS}-week free run for a few shops in [City]/[State]. Self-serve setup with a step-by-step guide in the dashboard. I'm here by email/text if you get stuck. No credit card to start. If it's not a fit, stop anytime — no contract.

We're also shipping a mobile app. I'd rather shape it with owners who actually run these calls than guess alone. Share honest feedback after the free run and we lock in founder pricing for ${SITE.betaDiscountYears} years — full plan details are on ${SITE.url}/#pricing.

${outreachReplyPrompts.video}
${outreachReplyPrompts.try}

${outreachPilotDisclaimer}

— Min
Effiroad
${SITE.url}`,

  sms: `Hi [First name] — Min, Effiroad.

Building after-hours call intake with restoration owners. When [Shop name]'s crew is on a job, does the phone still get answered?

${SITE.url} has a 1-min interactive demo. ${COBUILD_PILOT_WEEKS}-week free run — self-serve, no card. Reply VIDEO or TRY.`,

  linkedInConnect: `[First name] — building Effiroad for independent restoration after-hours intake. Would value connecting with an owner in [State].`,

  linkedInDm: `[First name] — thanks for connecting.

I'm building Effiroad with shop owners who still miss calls when the crew is tied up. It answers as your shop, runs intake, and texts your on-call crew — fire/sewage waits on you first.

${SITE.url} has a quick interactive demo if you want to see the flow before committing.

Happy to set up a ${COBUILD_PILOT_WEEKS}-week free run on [Shop name]. No credit card. Stop anytime if it's not a fit.

— Min`,

  videoCoverNote: `[First name] — recording attached. Two minutes: caller → intake → crew text.

If this matches how [Shop name] should handle after-hours, reply TRY — self-serve setup takes about ten minutes on your side.

Not a fit? Reply PASS.

— Min`,

  followUpNoReply: `[First name] — following up once.

Still have a ${COBUILD_PILOT_WEEKS}-week free run open for [Shop name]. ${SITE.url} has the interactive demo if you want to see the flow first.

Reply VIDEO · TRY · PASS

— Min`,

  followUpInterested: `[First name] — good to hear.

Reply TRY and I'll send the signup link + forwarding guide. Self-serve setup — no call needed. You can test on real traffic for ${COBUILD_PILOT_WEEKS} weeks free.

— Min`,

  followUpLast: `[First name] — last note from my side.

If after-hours is already covered at [Shop name], no action needed.

If it's still a gap, reply TRY for the free run or PASS and I won't follow up again.

— Min
Effiroad`,

  tryReplyTemplate: `[First name] — here's how to start (no call needed):

1. Sign up: ${SITE.url}/signup
2. Choose Restoration or HVAC
3. Settings → Forwarding — follow the step-by-step guide for your carrier
4. Run a test call (Settings shows the button)
5. Try the interactive demo on the homepage anytime

${COBUILD_PILOT_WEEKS}-week free run starts at signup — no credit card. After it ends, one line of feedback locks founder pricing for ${SITE.betaDiscountYears} years (see ${SITE.url}/#pricing).

Reply here if anything doesn't match your phone — we answer by email/text.

${outreachPilotDisclaimer}

— Min`,

  postPilotTransition: `[First name] — your free run wraps up [date].

If Effiroad is handling calls the way you want, pick a plan at ${SITE.url}/#pricing. Share feedback when prompted and founder pricing locks for ${SITE.betaDiscountYears} years.

Want changes first? Reply here and we'll adjust dispatch rules or timing.

— Min`,

  emailBodyKo: `[First name]님, [Shop name]

독립 복구 업체 오너분들과 함께 Effiroad를 만들고 있습니다. 야간·현장 중 부재중 전화가 아직 고민이시면 ${COBUILD_PILOT_WEEKS}주 무료로 같이 써보시면 좋겠습니다.

${SITE.url} 에서 1분 인터랙티브 데모로 자동 응대 흐름을 미리 볼 수 있습니다.

답장: VIDEO / TRY / PASS

— Min`,

  sendChecklist: [
    "Fill [First name], [Shop name], [City], [State] — every send",
    "Send one at a time from helloeffiroad@gmail.com — no BCC",
    "Send Tue–Thu, 8–10am shop local time",
    "VIDEO reply → Loom within 1 hour",
    "TRY reply → tryReplyTemplate (self-serve, no Zoom)",
    "No dollar amounts in cold email — point to site pricing + 5-year founder discount after feedback",
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
