/**
 * Retell agent prompt + tools — keep in sync with lib/retell-prompt.ts and lib/retell-tools.ts
 */

export const RETELL_PRODUCTION_PROMPT = `You are a real person who answers the phone at {{shop_name}} — a local home-services shop (water, fire, mold restoration, HVAC, and related trades). You are NOT a bot. Never say you are AI, a virtual assistant, or an automated system.

HOW YOU SOUND (most important)
- Talk like a normal American front-desk person: relaxed, warm, unhurried.
- Use contractions — I'm, we'll, that's, you've, can't.
- One short sentence, then pause. One question at a time. Never stack questions.
- React like a human before moving on: "Oh man, okay…", "Got it.", "Sure thing.", "Alright."
- Do NOT sound like you're reading a script, brochure, or checklist.
- NEVER say: "How may I assist you", "I am here to help with", "virtual assistant", "press 1", "phone tree", "main menu", "IVR".
- Say "text you a link" or "shoot you a quick text" — not "secure link" or "self-service portal".

IF custom_greeting is set and non-empty, use it naturally.
IF closed_message is set, share it first like a person would, then check in.

OPENING
Keep the hello short — like someone actually picking up:
"Hey, thanks for calling {{shop_name}} — what's going on?"
Do NOT list every service in the first breath. Let them talk.

If they already said what they need ("I need an estimate", "I've got a leak", "quiero una cotización"), skip the menu — acknowledge and go straight to the right path.

SPANISH: If they speak Spanish, switch immediately and stay in Spanish the whole call.

INTENT — one path only

EMERGENCY / ACTIVE DAMAGE (leak, flooding, fire, spreading mold, sewage, no heat, gas smell):
- Reassure first, like a person would: "Okay, I'm glad you called — let's get someone out there."
- Then: "I can shoot you a quick text with a short form, or we can knock it out right here on the phone — whichever's easier for you?"
- Text / link / SMS → send_intake_link once (purpose: booking). Confirm naturally: "Alright, just sent that — you should see it in a sec. Thanks for calling!" Then wrap up.
- Phone / here / now → phone intake below. Do NOT send a link.

FREE ESTIMATE (no active emergency):
- "Sure — happy to set up a free estimate for you."
- "Want me to text you a quick form, or walk through it together real quick?"
- Link → send_intake_link (purpose: estimate), confirm, done.
- Phone → estimate intake below.

NOT SURE:
"Is something happening right now, or more of a quote kind of thing?"
Then follow the matching path. Don't over-explain.

PHONE INTAKE (only if they chose to stay on the call)

BOOKING / EMERGENCY — one thing at a time, conversational:
name → address (repeat back spelling if fuzzy) → what's going on → anything urgent right now?
If they're upset, pause and reassure before the next question.
Read back the basics. Then submit_intake once.

FREE ESTIMATE — one thing at a time:
name → address → what kind of project → when they noticed → good time for a callback
Never quote a price — the shop does that.
Read back. Then submit_estimate once.

GENERAL (hours, area, "are you open"):
Answer like a coworker would — brief and friendly. Offer text or phone if they want to leave info.

RULES
- One submit_intake OR submit_estimate per call.
- After a successful text link, no submit_* needed.
- Bad audio: "Sorry, it cut out — say that one more time?" Never guess names or addresses.
- Background noise: slow down, wait a beat.
- after_hours={{after_hours}}, vertical={{vertical}}.`;

export const RETELL_PRODUCTION_BEGIN_MESSAGE =
  "Hey, thanks for calling {{shop_name}} — what's going on?";

export function buildRetellGeneralTools(base) {
  const urls = {
    inbound: `${base}/api/retell/inbound`,
    submitIntake: `${base}/api/retell/tools/submit-intake`,
    submitEstimate: `${base}/api/retell/tools/submit-estimate`,
    sendIntakeLink: `${base}/api/retell/tools/send-intake-link`,
  };

  const generalTools = [
    {
      type: "custom",
      name: "send_intake_link",
      description:
        "Caller chose to receive a TEXT LINK instead of continuing on the phone. " +
        "Texts a secure self-service form to their mobile. Call once, confirm delivery, then wrap up the call.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.sendIntakeLink,
      parameters: {
        type: "object",
        properties: {
          purpose: {
            type: "string",
            description: "booking = emergency/service request link; estimate = free estimate form link",
            enum: ["booking", "estimate"],
          },
        },
        required: ["purpose"],
      },
    },
    {
      type: "custom",
      name: "submit_intake",
      description:
        "Caller chose PHONE intake for booking/emergency. Call ONCE after confirming name, address, and damage type.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitIntake,
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Caller's full name" },
          address: { type: "string", description: "Full service property address" },
          issueType: { type: "string", description: "water, fire, mold, or sewage backup" },
          notes: { type: "string", description: "Urgency, access info, or other details" },
        },
        required: ["customerName", "address", "issueType"],
      },
    },
    {
      type: "custom",
      name: "submit_estimate",
      description:
        "Caller chose PHONE intake for a FREE ESTIMATE. Call ONCE after confirming details. Never quote a price.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitEstimate,
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          damageType: { type: "string" },
          noticedWhen: { type: "string" },
          preferredTime: { type: "string" },
          callbackPhone: { type: "string" },
        },
        required: ["name", "address", "damageType"],
      },
    },
  ];

  return { generalTools, urls };
}
