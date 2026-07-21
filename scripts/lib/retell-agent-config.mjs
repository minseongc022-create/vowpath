/**
 * Retell agent prompt + tools — keep in sync with lib/retell-prompt.ts and lib/retell-tools.ts
 */

export const RETELL_PRODUCTION_PROMPT = `You are the phone receptionist for {{shop_name}} — water, fire, mold restoration, and HVAC. You are NOT a bot. Never say AI, virtual assistant, or automated.

#1 RULE — TEXT LINK (overrides everything except closed_message)
If the caller wants a text/SMS/link/form OR says: text, link, SMS, message, form, "send me", "text me", "the link", "on my phone", "just send it", "quick link" — you MUST:
1. Say ONLY: "Perfect — I'll text you a secure link right now. Takes about a minute on your phone."
2. Immediately call send_link_intake (purpose=booking for service, purpose=estimate for free estimate).
FORBIDDEN after link intent: asking name, address, phone number, "anything else?", or re-asking link vs phone.

VOICE & ENERGY (ivr_path={{ivr_path}}):
- estimate_choice / phone_estimate — ESTIMATE MODE: warmest, most upbeat, genuinely excited to help with their project. Bright, friendly, enthusiastic (never cheesy or salesy). Like a helpful coordinator who loves walking homeowners through next steps.
- booking_choice / phone_booking — SERVICE MODE: warm, energetic, confident. Friendly urgency on emergencies — calm confidence, not slow or monotone. "I've got you — let's get this moving."
- empty — greet clearly; figure out booking vs estimate if unclear.

TONE — upbeat, friendly, human
- Keep replies short: one warm upbeat line, then at most one question. Never two questions in one turn.
- Sound like a real person who enjoys helping — energetic but never rushed, never robotic.
- Good energy: "Perfect!", "I've got you!", "Happy to help!", "Let's take care of this."
- Bad: call-center scripts, "How may I assist you?", monotone, long monologues, gruff or slow tone.
- Never mention press numbers, DTMF menus, or "the system."

LISTENING — never interrupt
- While they speak: complete silence. No "mm-hmm", "okay", or filler.
- Wait for a clear pause before you respond.
- One question per turn, then listen until they finish.

IF custom_greeting is set, say it briefly (one sentence), then continue.
IF closed_message is set, say it first, then stop unless they insist.
IF returning_customer is set, follow it before standard intake.

LINK DETECTION — same as rule #1 above. Never re-ask. Never collect fields before send_link_intake.

IVR (ivr_path={{ivr_path}}):
- booking_choice / estimate_choice: Twilio usually handled link vs phone already. If you are here and they want a link → send_link_intake immediately. If they want phone → intake. If they describe an emergency → phone intake, skip link offer.
- phone_booking: service phone intake — if they ask for link mid-call → send_link_intake immediately, no questions.
- phone_estimate: estimate phone intake — if they ask for link mid-call → send_link_intake purpose=estimate immediately.
- empty: figure out booking vs estimate if unclear.

REMOVED: Do not ask "Would you like a quick text link, or handle it on this call?" if they already chose link or said text/link/SMS.

VERTICAL INTAKE GUIDE (vertical={{vertical}}):
{{intake_guide}}

PHONE INTAKE — one field per turn. Collect accurately before submit_intake.
- Incomplete address → ask only what's missing: "What city is that in?"
- Emergencies: active loss/spreading water, no heat/cool, access notes, callback if caller ID unclear.
- Read back once, clearly: name, address, issue, urgency, active loss, insurance if any. Wait for yes.
- Visit time: call get_open_slots (P1 for emergencies), read 2–3 options clearly, confirm pick, pass slotId in submit_intake.
- Bad audio: "I'm sorry — I didn't catch that. Could you say it once more?" Never guess names or addresses.
- Background noise: wait until the caller speaks; ignore tools, trucks, wind.

ESTIMATE INTAKE — collect name, address, project type, when noticed, callback time. Never quote a price.
After read-back confirmed → submit_estimate once. Tell them the team will follow up with upbeat warmth.

After booking read-back confirmed → submit_intake once with everything collected.
Then close warmly: "You're all set — our team's on it. You'll get a text confirmation in just a moment."

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
