import type { TourStep } from "@/components/shared/GuidedTour";

/** Dashboard quick tour — order matches top-to-bottom layout on the home page. */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "kpi-cards",
    title: "📈 At a glance",
    description:
      "Calls handled, customers waiting, and bookings — live for your selected date range. Tap Edit to choose which cards show.",
    target: '[data-tour-step="kpi-cards"]',
  },
  {
    id: "new-request",
    title: "🆕 Add a request",
    description:
      "Log a walk-in or field job without a phone call. Handy for returning customers or jobs you take on-site.",
    target: '[data-tour-step="new-request"]',
  },
  {
    id: "pending-review",
    title: "⏳ Pending approval",
    description:
      "When the AI needs your OK, requests land here. Approve or decline and the customer is texted automatically.",
    target: '[data-tour-step="pending-review"]',
  },
  {
    id: "revenue",
    title: "💰 Revenue",
    description:
      "Connect Jobber in Settings to see collected invoice totals here. Green numbers update after each sync.",
    target: '[data-tour-step="revenue"]',
  },
  {
    id: "recovery-metrics",
    title: "📊 Call recovery",
    description:
      "See AI bookings, after-hours captures, and missed-call saves — counted from real call logs, not estimates.",
    target: '[data-tour-step="recovery-metrics"]',
  },
  {
    id: "call-insights",
    title: "💡 Call insights",
    description:
      "Quick breakdown of after-hours, weekend, and emergency calls Effiroad handled in this period.",
    target: '[data-tour-step="call-insights"]',
  },
  {
    id: "trend-chart",
    title: "📉 Trends",
    description:
      "Day-by-day call-handling chart. Switch 7 / 30 / 90 days in the toolbar above.",
    target: '[data-tour-step="trend-chart"]',
  },
  {
    id: "recent-requests",
    title: "📋 Recent requests",
    description:
      "Latest captured jobs. Tap one for customer details, address, issue type, and the AI summary.",
    target: '[data-tour-step="recent-requests"]',
  },
  {
    id: "upcoming-bookings",
    title: "📅 Upcoming schedule",
    description:
      "Approved visits that are not done yet. Check before your crew heads out.",
    target: '[data-tour-step="upcoming-bookings"]',
  },
  {
    id: "sidebar-ai",
    title: "✨ Effiroad AI",
    description:
      "On mobile, the AI button is here at the bottom. On desktop, it's in the left sidebar. Ask about setup, calls, or today's numbers.",
    target: '[data-tour-step="sidebar-ai"]',
  },
];

/** Settings tour — top-to-bottom, matching the Go live 1→2→3→4 flow on the page. */
export function getSettingsTourSteps(): TourStep[] {
  return [
      {
        id: "go-live-progress",
        eyebrow: "Start here",
        title: "🎯 Your go-live checklist",
        description:
          "Follow steps 1→2→3 below in order. The progress bar shows what's left before Effiroad starts answering your shop line.",
        target: "#go-live-progress",
      },
      {
        id: "integrations-hub",
        eyebrow: "Overview",
        title: "🔌 Integration map",
        description:
          "A quick snapshot of Phone, Jobber, Zapier, and website chat. Green = done. Tap any card to jump to that section.",
        target: "#integrations-hub",
      },
      {
        id: "go-live-contact",
        eyebrow: "Step 1 of 4 · Required",
        title: "📱 Verify your contact",
        description:
          "First, add the email and mobile number for new-request alerts. Steps 2 and 3 stay locked until this is saved.",
        target: "#go-live-contact",
      },
      {
        id: "go-live-schedule",
        eyebrow: "Step 2 of 4 · Required",
        title: "🕐 Set answer hours",
        description:
          "Next, choose when Effiroad picks up — nights, weekends, or always-on. Match the hours you want AI instead of your phone.",
        target: "#go-live-schedule",
      },
      {
        id: "go-live-phone",
        eyebrow: "Step 3 of 4 · Required",
        title: "☎️ Connect call forwarding",
        description:
          "Then get your Effiroad number and forward unanswered calls from your main line. Customers still dial your usual shop number.",
        target: "#go-live-phone",
      },
      {
        id: "go-live-jobber",
        eyebrow: "Step 4 of 4 · Optional",
        title: "🔗 Connect Jobber",
        description:
          "Optional — link Jobber so approved jobs sync to your calendar and revenue appears on the dashboard.",
        target: "#go-live-jobber",
      },
      {
        id: "product-settings",
        eyebrow: "After go-live",
        title: "⚙️ Shop preferences",
        description:
          "Once the go-live steps are done, fine-tune booking rules, crew texts, and optional extras in this section below.",
        target: "#product-settings",
      },
      {
        id: "shop-name",
        eyebrow: "Preferences",
        title: "🏢 Business name",
        description:
          "The name customers hear on calls and booking texts. Use your real shop name.",
        target: "#shop-name",
      },
      {
        id: "shop-vertical",
        eyebrow: "Preferences",
        title: "🔧 Your trade",
        description:
          "Restoration or HVAC — this sets the AI answering script and intake questions.",
        target: "#shop-vertical",
      },
      {
        id: "booking-settings",
        eyebrow: "Preferences",
        title: "📅 Booking rules",
        description:
          "Choose auto-confirm vs. text-you-first for routine jobs. Urgent or unclear calls always come to you.",
        target: "#booking-settings",
      },
      {
        id: "tech-dispatch",
        eyebrow: "Preferences",
        title: "🚚 Crew dispatch",
        description:
          "Add techs and on-call days. When a job confirms, they get a text — reply 1 to accept.",
        target: "#tech-dispatch",
      },
      {
        id: "settings-save",
        eyebrow: "Finish",
        title: "💾 Save all settings",
        description:
          "After any change, tap Save all settings at the bottom. Go-live steps 2–3 also need a save before they count as done.",
        target: '[data-tour-step="settings-save"]',
      },
    ];
}

export const SETTINGS_TOUR_STEPS: TourStep[] = getSettingsTourSteps();
