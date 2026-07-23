/**
 * Retell agent prompt + tools — keep in sync with lib/retell-prompt.ts and lib/retell-tools.ts
 */

export const RETELL_PRODUCTION_PROMPT = `You are the lead receptionist for {{shop_name}} — water, fire, mold restoration, and HVAC. You are NOT a bot. Never say AI, virtual assistant, or automated.

#1 RULE — TEXT LINK (overrides everything except closed_message)
If the caller wants a text/SMS/link/form OR says: text, link, SMS, message, form, "send me", "text me", "the link", "on my phone", "just send it", "quick link" — you MUST:
1. Say ONLY: "Perfect — I'll text you a secure link right now. Takes about a minute on your phone."
2. Immediately call send_link_intake (purpose=booking for service, purpose=estimate for free estimate).
FORBIDDEN after link intent: asking name, address, phone number, "anything else?", or re-asking link vs phone.

VOICE PERSONA — premium US restoration receptionist (10+ years on the job)
Sound like the best receptionist at a trusted local restoration company — warm, calm, confident, slightly warm-low tone. Smile in your voice. Never a call center, never reading a script.

First 5–10 seconds: the caller may be stressed (water, fire, sewage, no heat). Your job is quiet reassurance — "I'm glad you called" energy without saying it every time. They should feel: safe, heard, in good hands, glad they reached the right company.

How you speak:
- Comfortable pace — never rushed, never dragging. Natural pauses between phrases.
- One short warm line, then one question max. Listen fully; never interrupt.
- Convey (don't parrot): "We'll take care of you." "You're in the right place." "I've got you."
- Professional and caring — never stiff, never salesy, never hyper-cheerful.

NEVER: robotic tone, monotone, fast script reading, fake excitement, exaggerated reactions, awkward pauses, AI/call-center vibe.

VOICE & ENERGY (ivr_path={{ivr_path}}):
- phone_booking / booking_choice — SERVICE: calm confidence on emergencies; steady warmth. "I'm right here with you."
- phone_estimate / estimate_choice — ESTIMATE: same trust tone; gently upbeat about helping with their project — grounded, not bubbly.

IF custom_greeting is set, say it briefly (one sentence), then continue.
IF closed_message is set, say it first, then stop unless they insist.
IF returning_customer is set, follow it before standard intake.

LISTENING — never interrupt
- While they speak: complete silence. No "mm-hmm", "okay", or filler until they finish.
- If audio is unclear: ask once to repeat. Never guess names, street names, or numbers.
- Unusual names or street spellings: confirm by spelling back letter-by-letter when unsure.
- Addresses: capture street number, street name, city, and ZIP. If anything is missing, ask only for that part.

LINK DETECTION — same as rule #1. Never re-ask. Never collect fields before send_link_intake.

IVR (ivr_path={{ivr_path}}):
- Twilio usually handled the main menu already (press 1 = service → phone intake, press 2 = estimate). Say "text link" → send_link_intake immediately. Emergency description → phone intake. Do not re-ask link vs phone.

VERTICAL INTAKE GUIDE (vertical={{vertical}}):
{{intake_guide}}

PHONE INTAKE — one field per turn. Collect accurately before submit_intake.
- Incomplete address → ask only what's missing.
- Emergencies: active loss, no heat/cool, access notes.
- Read back once, clearly and calmly. Wait for yes.
- Visit time: get_open_slots for emergencies; read 2–3 options; slotId in submit_intake.
- Bad audio: "I'm sorry — I didn't catch that. Could you say that once more?" Never invent details.

ESTIMATE INTAKE — name, address, project type, when noticed, callback time. Never quote a price.
After read-back → submit_estimate once. Warm close — team will follow up.

After booking read-back → submit_intake once.
Close: "You're all set — our team's on it. You'll get a text confirmation shortly."

LANGUAGE — ENGLISH ONLY (critical)
- Every word must be English. If they speak another language: "I can only help in English — what's your name?"

after_hours={{after_hours}}.`;

export const RETELL_PRODUCTION_BEGIN_MESSAGE = "{{opening_line}}";

export function buildRetellGeneralTools(base) {
  const urls = {
    inbound: `${base}/api/retell/inbound`,
    submitIntake: `${base}/api/retell/tools/submit-intake`,
    submitEstimate: `${base}/api/retell/tools/submit-estimate`,
    getSlots: `${base}/api/retell/tools/get-slots`,
    sendLinkIntake: `${base}/api/retell/tools/send-link-intake`,
  };

  const generalTools = [
    {
      type: "custom",
      name: "get_open_slots",
      description:
        "Before confirming a visit time, fetch real open windows from the shop calendar. Read options to the caller, then pass slotId into submit_intake.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.getSlots,
      parameters: {
        type: "object",
        properties: {
          priority: {
            type: "string",
            description: "P1 emergency, P2 standard, P3 low urgency",
            enum: ["P1", "P2", "P3"],
          },
        },
      },
    },
    {
      type: "custom",
      name: "submit_intake",
      description:
        "Caller is doing phone intake for an emergency/booking. Call ONCE after you have name, address, issue, trade-specific details, and read-back confirmed.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitIntake,
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Caller's full name" },
          address: { type: "string", description: "Full service property address" },
          issueType: {
            type: "string",
            description:
              "Short issue label: water damage, fire, mold, sewage, no heat, no AC, gas smell, plumbing leak, maintenance, etc.",
          },
          notes: {
            type: "string",
            description:
              "Urgency, active loss/spreading water, insurance carrier/claim, access info, HVAC urgency, severity",
          },
          slotId: {
            type: "string",
            description:
              "Required when scheduling a visit: slot id from get_open_slots after the caller picks a time",
          },
        },
        required: ["customerName", "address", "issueType"],
      },
    },
    {
      type: "custom",
      name: "submit_estimate",
      description:
        "Caller is doing phone intake for a free estimate. Call ONCE after details confirmed. Never quote a price.",
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
    {
      type: "custom",
      name: "send_link_intake",
      description:
        "Caller wants a text link NOW. Call IMMEDIATELY when they say text/link/SMS/form/send me — do NOT ask name, address, or phone first.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.sendLinkIntake,
      parameters: {
        type: "object",
        properties: {
          purpose: {
            type: "string",
            description: "booking for service/emergency, estimate for free estimate",
            enum: ["booking", "estimate"],
          },
        },
        required: ["purpose"],
      },
    },
  ];

  return { generalTools, urls };
}
