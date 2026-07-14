import { SITE } from "@/lib/constants";
import { TRIAL_DAYS, PILOT_TRIAL_DAYS } from "@/lib/billing-cohort";
import { siteFaq, siteHowItWorks, sitePricing } from "@/lib/site-content";

/** Compact product knowledge for the public Effiroad assistant. */
export function buildSiteAssistantKnowledge(): string {
  const faqBlock = siteFaq.items
    .map((item) => `Q: ${item.q}\nA: ${item.a}`)
    .join("\n\n");

  const howSteps = siteHowItWorks.steps
    .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
    .join("\n");

  const plans = sitePricing.plans
    .map(
      (p) =>
        `${p.name} — ${p.price}${p.period}${"usageLine" in p ? ` (${p.usageLine})` : ""}: ${p.description}`,
    )
    .join("\n");

  return `
Effiroad (${SITE.url}) — AI answering service for US home-service shops (water/fire/mold restoration, HVAC).

PRICING:
${plans}
Trial: ${TRIAL_DAYS}-day free signup trial. Pilot shops with inbound line: ${PILOT_TRIAL_DAYS}-day pilot.

HOW IT WORKS:
${howSteps}

KEY FEATURES:
- Keep your existing phone number — forward unanswered/after-hours calls to Effiroad
- AI phone menu: press 1 = service/emergency, press 2 = free estimate → SMS link intake
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
