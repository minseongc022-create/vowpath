/** Marketing copy — US HVAC operating flow (matches product). */



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

      "Customers keep calling the number they already know. When you miss a call — evenings, weekends, or on a job — it forwards to Effiroad.",

    outputs: ["Same public number", "Conditional forwarding", "Custom hours"],

    details: [

      {

        label: "Public number",

        text: "Your website, Google listing, and truck wrap stay unchanged.",

      },

      {

        label: "Conditional forward",

        text: "No answer, busy, or after a few rings → routes to Effiroad.",

      },

      {

        label: "After hours",

        text: "Set schedules in your carrier, VoIP, or Jobber Phone rules.",

      },

    ],

  },

  {

    id: "intake",

    phase: "Step 2",

    title: "Phone or link intake",

    summary:

      "Forwarded calls reach a guided intake — by phone or a text link. We collect contact info, address, and the issue, then summarize it for you.",

    outputs: ["Phone intake", "Link intake", "Clean summary"],

    details: [

      {

        label: "How customers submit",

        text: "Talk through the call, or fill out the link sent by text.",

      },

      {

        label: "What we capture",

        text: "Name, phone, address, and problem details — what you need to schedule.",

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

    title: "Approve by text or email",

    summary:

      "Each new request hits your cell as a short text. The same summary lands in your inbox if you want a second look at your desk.",

    outputs: ["SMS alert", "Email backup", "Reply 1 or 2"],

    details: [

      {

        label: "Text (primary)",

        text: "A summary arrives on your phone. Reply 1 to approve, 2 to pass.",

      },

      {

        label: "Email (backup)",

        text: "Same details in your inbox — handy when you are at a computer.",

      },

      {

        label: "Customer update",

        text: "When you approve, the homeowner gets a confirmation text automatically.",

      },

    ],

  },

  {

    id: "jobber",

    phase: "Step 4",

    title: "Jobber sync (optional)",

    summary:

      "Approved requests can sync to Jobber as Requests. No Jobber? Run the whole shop on texts and the dashboard.",

    outputs: ["On approval", "Optional sync", "Dashboard history"],

    details: [

      {

        label: "Auto sync",

        text: "Reply 1 and the request lands in Jobber — no double entry.",

      },

      {

        label: "Optional",

        text: "Connect only if you already run your shop on Jobber.",

      },

      {

        label: "Dashboard",

        text: "Review intake and approval history on the web anytime.",

      },

    ],

  },

];



export const HERO_FLOW_TAGS = [

  "Phone · link intake",

  "Approval text to you",

  "Reply 1 · 2",

  "Customer auto-update",

] as const;



export const HERO_FLOW_PIPELINE = [

  { step: "01", title: "Customer request", subtitle: "Phone or link", icon: "intake" as const },

  { step: "02", title: "Your alert", subtitle: "Summary by SMS", icon: "sms" as const },

  { step: "03", title: "Your decision", subtitle: "1 approve · 2 pass", icon: "review" as const },

  { step: "04", title: "Customer notified", subtitle: "Confirmed or declined", icon: "notify" as const },

] as const;



export const HERO_FLOW_LOOP_SUMMARY =

  "A customer calls or submits a link. Effiroad texts you a summary. Reply 1 to approve or 2 to pass — the homeowner gets the result automatically.";



export const OPERATING_FLOW_NODES = [

  { id: "customer", title: "Customer request", caption: "Phone or link" },

  { id: "effiroad", title: "Effiroad", caption: "Summary · approval request" },

  { id: "owner", title: "Your decision", caption: "Reply 1 or 2" },

  { id: "customer-out", title: "Customer update", caption: "Confirmation text" },

] as const;



export const OPERATING_FLOW_EDGES = [

  "Details organized for you",

  "Summary text to your cell",

  "Your reply → customer notified",

] as const;

