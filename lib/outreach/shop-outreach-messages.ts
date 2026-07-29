import { SITE } from "@/lib/constants";
import { COBUILD_PILOT_WEEKS } from "./partnership-pilot-copy";

/**
 * One-time, founder-to-owner outreach — warm, feedback-first, not salesy.
 * Personalize [City]/[State] if you know it. Do NOT paste liability disclaimers in cold outreach.
 */

export type ShopOutreachChannel = "email" | "sms" | "linkedin_dm";

export type ShopOutreachTarget = {
  id: string;
  shop: string;
  firstName: string;
  city: string;
  state: string;
  channel: ShopOutreachChannel;
  contact: string;
  subject?: string;
  body: string;
};

const demoLine = `${SITE.url} has a 1-min interactive demo — tap through a sample emergency call (no signup).`;

export const shopOutreachTargets: ShopOutreachTarget[] = [
  {
    id: "dry-out-daddy",
    shop: "Dry Out Daddy Restoration",
    firstName: "Justin",
    city: "Tampa",
    state: "FL",
    channel: "email",
    contact: "Justin@dryoutdaddyrestoration.com",
    subject: "Justin — quick favor on after-hours calls?",
    body: `Hi Justin,

I saw you run Dry Out Daddy solo in Tampa — when you're on a job and the phone rings, I'm guessing it still goes to voicemail sometimes.

I'm building Effiroad with a few independent restoration owners. It answers as your shop, runs intake on the call, and texts your crew — fire/sewage always waits on your OK first.

I'm not trying to sell you anything today. I'm opening a ${COBUILD_PILOT_WEEKS}-week free try for a handful of shops. Self-serve setup (~10 min). If you can test it on real traffic and tell me honestly what works and what doesn't, that would help a lot.

${demoLine}

Worth a look? Just reply here — no call needed.

— Min
Effiroad`,
  },
  {
    id: "all-elite",
    shop: "All Elite Restoration",
    firstName: "Shameel",
    city: "Kennesaw",
    state: "GA",
    channel: "email",
    contact: "alleliterestoration@gmail.com",
    subject: "Shameel — when you're on the job and it rings",
    body: `Hi Shameel,

Reviews say when someone calls All Elite they get you — which is great until you're elbow-deep on a water job at 2am.

I'm building Effiroad for shops like yours: answers overflow/after-hours as All Elite, captures the loss details, texts your on-call crew. Your Google number stays the same.

Would you try it free for ${COBUILD_PILOT_WEEKS} weeks and share blunt feedback? I handle setup support by email/text. No credit card, stop anytime.

${demoLine}

Reply if you're open to it — even a "not for us" helps.

— Min`,
  },
  {
    id: "rescue-ga",
    shop: "Rescue Restoration",
    firstName: "Ben",
    city: "Atlanta",
    state: "GA",
    channel: "email",
    contact: "service@rescuega.com",
    subject: "Ben — after-hours at Rescue Restoration",
    body: `Hi Ben,

Quick note from another founder — I'm building call intake for independent restoration shops in Atlanta.

When Rescue's crew is tied up, Effiroad can answer as your shop, collect address + issue on the call, and text your on-call crew. Risky jobs wait on your text approval first.

I'm looking for 2–3 owners to run a free ${COBUILD_PILOT_WEEKS}-week trial and tell me what to fix. Not a sales pitch — I genuinely want your take.

${demoLine}

Interested? Reply TRY and I'll send the setup link.

— Min`,
  },
  {
    id: "crew-restoration",
    shop: "Crew Restoration",
    firstName: "Matt",
    city: "Riverview",
    state: "FL",
    channel: "email",
    contact: "info@crewrestoration.net",
    subject: "Crew Restoration — feedback on after-hours intake?",
    body: `Hi Matt,

Family-run shops in Tampa Bay get slammed during storm season — and the phone doesn't stop when everyone's on a job.

I built Effiroad to answer those calls as Crew Restoration, run intake, and text your crew. Same number, no CRM swap.

I'm offering a free ${COBUILD_PILOT_WEEKS}-week run to a few owners who'll try it and tell me what's missing. Setup is self-serve with email support if you get stuck.

${demoLine}

Open to a look? Happy to answer questions by email.

— Min`,
  },
  {
    id: "av-group",
    shop: "AV Group Restoration",
    firstName: "Angelica",
    city: "Riverview",
    state: "FL",
    channel: "email",
    contact: "info@avgrouprestoration.com",
    subject: "AV Group — would love your take",
    body: `Hi Angelica,

I'm reaching out to a few Tampa Bay restoration owners — AV Group came up as a shop that stays busy when storms hit.

Effiroad answers after-hours/overflow calls as your shop, captures the job details, and texts your crew. You stay in control on fire, sewage, and anything unclear.

I'm not asking for a contract — just a ${COBUILD_PILOT_WEEKS}-week free try and honest feedback so I can build this right for shops your size.

${demoLine}

Let me know if you'd try it.

— Min`,
  },
  {
    id: "emergency-restoration",
    shop: "Emergency Restoration Solutions",
    firstName: "there",
    city: "Duluth",
    state: "GA",
    channel: "email",
    contact: "info@emergencyrestoration.net",
    subject: "Emergency Restoration — after-hours calls",
    body: `Hi there,

I'm building Effiroad with independent restoration owners in Georgia — after-hours intake when the crew is already on a job.

It answers as Emergency Restoration, collects name/address/issue, and texts your on-call crew. Your number stays the same.

Free ${COBUILD_PILOT_WEEKS}-week trial — I'm asking owners to test it once and tell me what to improve. No signup call required.

${demoLine}

Reply if you'd give it a shot.

— Min`,
  },
  {
    id: "1st-choice",
    shop: "1st Choice Water Damage Restoration",
    firstName: "Dora",
    city: "Houston",
    state: "TX",
    channel: "linkedin_dm",
    contact: "linkedin.com/in/dora-gonzales-6b0907264",
    body: `Hi Dora — thanks for connecting.

I saw you run 1st Choice in Houston — small team, big call volume when pipes burst.

I'm building Effiroad: answers as your shop when you're on a job, intake on the call, texts your crew. Free ${COBUILD_PILOT_WEEKS}-week try — I just want honest feedback from owners who actually answer these calls.

${SITE.url} has a quick interactive demo if you want to see the flow first.

Worth trying? No pressure either way.

— Min`,
  },
  {
    id: "pdrt-tx",
    shop: "Property Damage Restoration of Texas",
    firstName: "Gerald",
    city: "Cypress",
    state: "TX",
    channel: "linkedin_dm",
    contact: "linkedin.com/in/gerald-alldredge-2771b41b1",
    body: `Hi Gerald — appreciate the connect.

With 25+ years in restoration you've probably seen every missed-call pattern. I'm building Effiroad for independent shops — after-hours intake + crew text, owner approval on risky jobs.

Looking for a few Texas owners to run a free ${COBUILD_PILOT_WEEKS}-week trial and tell me what's wrong with it. Not selling — learning.

Demo: ${SITE.url}

Open to a look?

— Min`,
  },
  {
    id: "aquaassist",
    shop: "AquaAssist Experts",
    firstName: "Cody",
    city: "Tampa",
    state: "FL",
    channel: "sms",
    contact: "(656) 222-7743",
    body: `Hi Cody — Min here. Saw AquaAssist reviews mention missed callbacks when you're on jobs. Built Effiroad to answer as your shop + text crew. Free ${COBUILD_PILOT_WEEKS}-wk try — just want feedback. Demo: ${SITE.url} — reply if open?`,
  },
  {
    id: "north-star",
    shop: "North Star Mechanical",
    firstName: "Lanny",
    city: "Garland",
    state: "TX",
    channel: "email",
    contact: "(214) 919-3300 — call or BBB message",
    subject: "Lanny — no-heat calls when techs are busy?",
    body: `Hi Lanny,

HVAC shops in Dallas lose no-heat calls when everyone's on a job — phone just rings.

Effiroad answers overflow/after-hours as North Star, runs safety check + intake, texts your on-call tech. Gas smell always texts you first — never auto-dispatches.

Free ${COBUILD_PILOT_WEEKS}-week try. I'm asking owners to test once and tell me what breaks. Self-serve setup, email support.

${demoLine}

Worth a conversation by email?

— Min`,
  },
];

/** Copy-paste helper — returns subject + body for a shop id. */
export function getShopOutreachMessage(id: string): ShopOutreachTarget | undefined {
  return shopOutreachTargets.find((t) => t.id === id);
}
