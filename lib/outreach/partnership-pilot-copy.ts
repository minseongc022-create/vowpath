import { SITE } from "@/lib/constants";

/** 3-week co-build pilot — used in founder outreach (adjust if PILOT_TRIAL_DAYS changes). */
export const COBUILD_PILOT_WEEKS = 3;

export const partnershipPilotCopy = {
  /** Short SMS / LinkedIn DM */
  sms: `Hi [First name] — I'm building Effiroad with shop owners, not just for them. It's an AI phone + dispatch layer for restoration/HVAC (after-hours intake, crew texts, booking).

3-week free pilot — I set it up with you. Use it, tell us what's wrong, and we'll fix it together. If it's not a fit, stop anytime during the pilot — no charge, no hard feelings.

After the pilot, shops that give feedback lock in ${SITE.betaIntroPrice}/mo (vs ${SITE.betaLockedPrice}/mo) for ${SITE.betaDiscountYears} years. Your input also shapes our mobile app roadmap.

Worth a 10-min look? ${SITE.url}`,

  /** Cold email — co-build partnership tone */
  emailSubject: `[Shop name] — building this with shop owners (3-week pilot)`,

  emailBody: `Hi [First name],

I'm reaching out because Effiroad isn't a finished product we're selling at you — we're building it *with* independent shops like [Shop name].

What it is today: AI answers after-hours and overflow calls, captures loss details, and texts your crew — clear water can auto-dispatch; fire/Cat-3 waits for your 1/2 approval. You keep your number. No CRM required.

What we're asking:
• **3-week free pilot** — I handle setup; you forward after-hours calls and use the dashboard.
• **Honest feedback** — what's confusing, what's missing, what would make you stay.
• **No lock-in during the pilot** — if it's not helping by week 2, stop. No invoice, no guilt trip.

If you stay after the pilot and share feedback, you get **${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years** (regular price is ${SITE.betaLockedPrice}/mo). That cohort also helps us prioritize the **mobile app** we're planning next — shops on the pilot list get first access.

Happy to send a 2-min screen recording or jump on a quick call.

— Min
${SITE.url}`,

  /** Follow-up after demo */
  followUp: `Hi [First name] — quick follow-up on Effiroad.

We're still in co-build mode: a small group of shops testing the product, sending feedback, and shaping what we ship next (including a future app).

Reminder on the offer:
• 3 weeks free, cancel anytime during the pilot
• Feedback → ${SITE.betaIntroPrice}/mo locked for ${SITE.betaDiscountYears} years
• Not a fit? Just say so — we'd rather know early

Want me to start setup this week?`,

  /** Korean reference for founder (not sent to US shops) */
  emailBodyKo: `[업체명] 대표님, 안녕하세요.

Effiroad는 '완성된 SaaS를 파는' 게 아니라, **복구·HVAC 업체와 함께 만들어 가는** AI 전화·디스패치 도구입니다.

• 야간/바쁠 때 AI가 전화 받고, 손실 정보 수집 후 크루에게 문자
• **3주 무료 파일럿** — 세팅은 저희가 도와드리고, 쓰시면서 피드백 주시면 됩니다
• **마음에 안 들면 파일럿 중 언제든 중단** — 비용 없음
• 피드백 주신 업체 → 정가 ${SITE.betaLockedPrice}/월 대신 **${SITE.betaIntroPrice}/월을 ${SITE.betaDiscountYears}년** 고정
• 장기적으로 **앱 출시**도 계획 중이며, 파일럿 업체 의견을 반영합니다

${SITE.url} 에서 대시보드 느낌 보실 수 있습니다. 10분 통화 가능하실까요?

— Min`,
} as const;
