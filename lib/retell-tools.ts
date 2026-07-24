/** Retell custom-function tools — keep in sync with scripts/lib/retell-agent-config.mjs */

export function buildRetellGeneralTools(base: string) {
  const urls = {
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
        "Optional legacy tool. Prefer NOT using on phone booking — after intake, submit_intake without slotId and the customer picks time via SMS link. Only call if the caller insists on locking a time verbally.",
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
        "Caller is doing phone intake for an emergency/booking. Call ONCE after you have name, issue, trade-specific details, and read-back confirmed. Do NOT collect full street address on the call — omit address (SMS link confirms it).",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitIntake,
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Caller's full name" },
          address: {
            type: "string",
            description:
              "Usually omit. Full street address is confirmed on the SMS portal link (typed/map), not spoken on the call.",
          },
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
              "Usually omit — customer picks time via SMS portal link. Only set if you used get_open_slots and the caller picked a time on the call.",
          },
        },
        required: ["customerName", "issueType"],
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
