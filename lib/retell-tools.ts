/** Retell custom-function tool definitions (shared by cron sync + local script). */

export function buildRetellGeneralTools(base: string) {
  const urls = {
    submitIntake: `${base}/api/retell/tools/submit-intake`,
    submitEstimate: `${base}/api/retell/tools/submit-estimate`,
    sendIntakeLink: `${base}/api/retell/tools/send-intake-link`,
  };

  const generalTools = [
    {
      type: "custom",
      name: "send_intake_link",
      description:
        "Text the caller a secure self-service link when they chose SMS/link instead of continuing on the phone. " +
        "Call once, then confirm and wrap up the call.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.sendIntakeLink,
      parameters: {
        type: "object",
        properties: {
          purpose: {
            type: "string",
            description: "booking or estimate — what the link is for",
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
        "Call once after phone intake for booking/emergency: customer name, property address, damage type, notes.",
      speak_after_execution: true,
      speak_during_execution: false,
      url: urls.submitIntake,
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Caller's name" },
          address: { type: "string", description: "Full property address" },
          issueType: { type: "string", description: "water, fire, mold, or sewage backup" },
          notes: { type: "string", description: "Anything else the caller mentioned" },
        },
        required: ["customerName", "address", "issueType"],
      },
    },
    {
      type: "custom",
      name: "submit_estimate",
      description:
        "Call once after phone intake for free estimate. Never quote a price.",
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
