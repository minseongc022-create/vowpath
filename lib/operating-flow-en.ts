/** Marketing copy — US restoration operating flow (matches product). */

export type OperatingFlowPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  outputs: string[];
  details: { label: string; text: string }[];
};

export const OPERATING_FLOW_PHASES: OperatingFlowPhase[] = [
  {
    id: "forwarding",
    phase: "Step 1",
    title: "Keep your main line",
    summary:
      "Homeowners keep calling the number they already know. When you miss a call — after hours, storm surge, or while on a job — it forwards to Effiroad.",
    outputs: ["Same public number", "Conditional forwarding", "Custom hours"],
    details: [
      {
        label: "Public number",
        text: "Your website, Google listing, and trucks stay unchanged.",
      },
      {
        label: "Conditional forward",
        text: "No answer, busy, or after a few rings → routes to Effiroad.",
      },
      {
        label: "After hours",
        text: "Set schedules in your carrier, VoIP, or business phone rules.",
      },
    ],
  },
  {
    id: "intake",
    phase: "Step 2",
    title: "Phone or link intake",
    summary:
      "Forwarded calls reach guided intake — by phone or text link. We collect contact info, property address, loss type, and urgency, then summarize for dispatch.",
    outputs: ["Phone intake", "Link intake", "Clean summary"],
    details: [
      {
        label: "How callers submit",
        text: "Talk through the call, or fill out the link sent by text.",
      },
      {
        label: "What we capture",
        text: "Name, phone, address, and loss details — what you need to roll a crew.",
      },
      {
        label: "Your summary",
        text: "Call and form details organized so you can decide fast.",
      },
    ],
  },
  {
    id: "review",
    phase: "Step 3",
    title: "Dispatch or approve by text",
    summary:
      "Standard water losses can auto-dispatch. Fire, Cat-3, or unclear intakes hit your cell: reply 1 to go, 2 to pass.",
    outputs: ["SMS alert", "Email backup", "Reply 1 or 2"],
    details: [
      {
        label: "Text (primary)",
        text: "A summary arrives on your phone. Reply 1 to dispatch, 2 to pass.",
      },
      {
        label: "Email (backup)",
        text: "Same details in your inbox — handy when you're at a desk.",
      },
      {
        label: "Customer update",
        text: "When you approve, the homeowner gets a confirmation or ETA text.",
      },
    ],
  },
  {
    id: "jobber",
    phase: "Step 4",
    title: "CRM sync (optional)",
    summary:
      "Approved jobs can sync to Jobber. No CRM? Run the whole company on texts and the dashboard.",
    outputs: ["On approval", "Optional sync", "Dashboard history"],
    details: [
      {
        label: "Auto sync",
        text: "Reply 1 and the job lands in your CRM — no double entry.",
      },
      {
        label: "Optional",
        text: "Connect only if you already use Jobber or similar.",
      },
      {
        label: "Dashboard",
        text: "Review intake and dispatch history on the web anytime.",
      },
    ],
  },
];

export const HERO_FLOW_TAGS = [
  "Phone · link intake",
  "Dispatch alert",
  "Reply 1 · 2",
  "Homeowner updated",
] as const;

export const HERO_FLOW_PIPELINE = [
  { step: "01", title: "Emergency call", subtitle: "Phone or link", icon: "intake" as const },
  { step: "02", title: "Your alert", subtitle: "Summary by SMS", icon: "sms" as const },
  { step: "03", title: "Your decision", subtitle: "1 dispatch · 2 pass", icon: "review" as const },
  { step: "04", title: "Crew rolling", subtitle: "Homeowner notified", icon: "notify" as const },
] as const;

export const HERO_FLOW_LOOP_SUMMARY =
  "A homeowner calls or submits a link. Effiroad captures the loss and texts you a summary. Reply 1 to dispatch or 2 to pass — the customer gets the update automatically.";

export const OPERATING_FLOW_NODES = [
  { id: "customer", title: "Emergency call", caption: "Phone or link" },
  { id: "effiroad", title: "Effiroad", caption: "Intake · dispatch request" },
  { id: "owner", title: "Your decision", caption: "Reply 1 or 2" },
  { id: "customer-out", title: "Homeowner update", caption: "Confirmation / ETA" },
] as const;

export const OPERATING_FLOW_EDGES = [
  "Loss details organized",
  "Summary text to your cell",
  "Your reply → crew or customer notified",
] as const;
