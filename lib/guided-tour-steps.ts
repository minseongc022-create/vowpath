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
      "Your shop assistant lives here on desktop — ask about setup, calls, crew dispatch, or today's numbers.",
    target: '[data-tour-step="sidebar-ai"]',
  },
];

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    id: "integrations-hub",
    title: "🔌 Integrations hub",
    description:
      "Quick overview of Phone, Jobber, Zapier, and website chat. Green badge = done. Tap any card to jump to setup.",
    target: "#integrations-hub",
  },
  {
    id: "go-live-phone",
    title: "☎️ Connect your number",
    description:
      "Get your dedicated number and set up forwarding here to go live. Just signed up? Start with this step.",
    target: "#go-live-phone",
  },
  {
    id: "go-live-contact",
    title: "📱 Verify your contact",
    description: "Register the email and phone that get new-request alerts.",
    target: "#go-live-contact",
  },
  {
    id: "go-live-schedule",
    title: "🕐 Answer hours",
    description: "Set when the AI answers for you (nights and weekends included).",
    target: "#go-live-schedule",
  },
  {
    id: "go-live-jobber",
    title: "🔗 Connect Jobber (optional)",
    description:
      "Already on Jobber? Connect it here to sync bookings and revenue automatically.",
    target: "#go-live-jobber",
  },
  {
    id: "shop-name",
    title: "🏢 Business name",
    description:
      "This is the name customers hear on booking texts and phone answers. Use your real business name.",
    target: "#shop-name",
  },
  {
    id: "shop-vertical",
    title: "🔧 Choose your trade",
    description:
      "Your trade (Restoration, HVAC, etc.) automatically tailors the AI's answering script and intake questions.",
    target: "#shop-vertical",
  },
  {
    id: "booking-settings",
    title: "📅 Booking & visit times",
    description:
      "Decide whether the AI auto-confirms routine requests or texts you for approval first.",
    target: "#booking-settings",
  },
  {
    id: "tech-dispatch",
    title: "🚚 Crew dispatch",
    description:
      "Add your techs and pick who is on-call each day. When a job confirms, they get a text — reply 1 to accept.",
    target: "#tech-dispatch",
  },
];
