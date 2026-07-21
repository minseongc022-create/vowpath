import { SITE } from "@/lib/constants";
import { TRIAL_DAYS, PILOT_TRIAL_DAYS } from "@/lib/billing-cohort";
import type { UiLocale } from "@/lib/locale";
import { getSiteFaq, getSiteHowItWorks, getSitePricing } from "@/lib/site-content-locale";

/** Compact product knowledge for the public Effiroad assistant. */
export function buildSiteAssistantKnowledge(locale: UiLocale = "en"): string {
  const faq = getSiteFaq(locale);
  const howItWorks = getSiteHowItWorks(locale);
  const pricing = getSitePricing(locale);

  const faqBlock = faq.items.map((item) => `Q: ${item.q}\nA: ${item.a}`).join("\n\n");

  const howSteps = howItWorks.steps
    .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
    .join("\n");

  const plans = [
    ...pricing.plans,
    ...("voicePlans" in pricing ? pricing.voicePlans : []),
  ]
    .map(
      (p) =>
        `${p.name} — ${p.price}${p.period}${"usageLine" in p ? ` (${p.usageLine})` : ""}: ${p.description}`,
    )
    .join("\n");

  return `
Effiroad (${SITE.url}) — AI answering service for US home-service shops (water/fire/mold restoration, HVAC).

PRICING:
${plans}
Billing tracks: (1) Dispatch — Lite/Flex/Pro/Scale: free estimates never bill; only approved or scheduled emergency dispatches count. (2) Voice minutes — Voice Starter / Voice Pro: included talk-minutes with published overage; each call rounds up to the next minute; free estimate (press 2) calls do not count; dispatch approvals are not charged again on Voice plans. Pending / held / declined / cancelled jobs do not bill on the dispatch track. Usage SMS alerts fire once at 80% and 100% of included caps.
Trial: ${TRIAL_DAYS}-day free signup trial. Pilot shops with inbound line: ${PILOT_TRIAL_DAYS}-day pilot.

HOW IT WORKS:
${howSteps}

KEY FEATURES:
- Keep your existing phone number — forward unanswered/after-hours calls to Effiroad
- AI phone menu: press 1 = service/emergency, press 2 = free estimate → SMS link intake
- Estimate pipeline: phone/link estimate leads land on the dashboard as Estimate (not billed). Owner texts a dollar quote from booking detail (“Send quote”); unbooked quotes get one SMS follow-up after 3 days when marketing SMS consent exists
- On-site estimate builder (truck): itemized line items (labor/materials/equipment/fees), tax, insurance claim fields, license/IICRC on document, customer share link at /e/[token] with print-to-PDF
- Auto-dispatch clear P1 jobs to on-call crew via SMS; owner approves exceptions (fire, Cat-3, unclear)
- Dashboard: requests/bookings, calendar, missed calls, daily briefing, Effiroad AI, settings
- Settings sections: contact & owner phone, phone forwarding setup & test, crew dispatch, booking hours, Jobber integration, automation rules, billing

SETTINGS LOCATIONS (after login):
- /dashboard/settings — main settings hub
- Forwarding: Settings → Phone → forwarding guide & test call
- Crew dispatch: Settings → Crew dispatch → add techs, on-call schedule
- Daily briefing SMS: Settings → Notifications
- Jobber: Settings → Integrations

FAQ:
${faqBlock}

CONTACT: ${SITE.supportEmail}
`.trim();
}
