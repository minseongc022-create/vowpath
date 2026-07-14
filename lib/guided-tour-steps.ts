import type { TourStep } from "@/components/shared/GuidedTour";

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "new-request",
    title: "🆕 Add a request yourself",
    description:
      "No call needed — log a new service request right here. Handy for walk-ins, jobs you take in the field, or a returning customer.",
    target: '[data-tour-step="new-request"]',
  },
  {
    id: "pending-review",
    title: "⏳ Requests waiting for you",
    description:
      "Calls the AI took land here for approval. Tap ✓ Approve or ✗ Decline and the customer is texted automatically. Checking once a day is plenty.",
    target: '[data-tour-step="pending-review"]',
  },
  {
    id: "revenue",
    title: "💰 Collected revenue",
    description:
      "Connect Jobber and you'll see collected revenue by period here. It's a 30-second link in Settings → Jobber.",
    target: '[data-tour-step="revenue"]',
  },
  {
    id: "recovery-metrics",
    title: "📊 Recovery metrics",
    description:
      "See how each job is progressing at a glance, and which loss types come in most often.",
    target: '[data-tour-step="recovery-metrics"]',
  },
  {
    id: "kpi-cards",
    title: "📈 Key metrics (KPIs)",
    description:
      "Calls handled, customers waiting, and bookings — live. Tap any card to expand the details behind it.",
    target: '[data-tour-step="kpi-cards"]',
  },
  {
    id: "trend-chart",
    title: "📉 Call-handling trend",
    description:
      "See how many after-hours and missed calls Effiroad handled, day by day. Switch 7 / 30 / 90 days up top.",
    target: '[data-tour-step="trend-chart"]',
  },
  {
    id: "recent-requests",
    title: "📋 Recent requests",
    description:
      "Your most recently captured requests. Tap one to see the customer's name, address, issue type, and the AI summary.",
    target: '[data-tour-step="recent-requests"]',
  },
  {
    id: "upcoming-bookings",
    title: "📅 Upcoming schedule",
    description:
      "Approved jobs that aren't done yet show here. Check today's schedule before your crew heads out.",
    target: '[data-tour-step="upcoming-bookings"]',
  },
];

export const SETTINGS_TOUR_STEPS: TourStep[] = [
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
      "Decide whether the AI auto-confirms routine requests or texts you for approval first. Urgent or unclear ones always come to you.",
    target: "#booking-settings",
  },
  {
    id: "integrations-hub",
    title: "🔌 Integrations hub",
    description:
      "Quick overview of Phone, Jobber, Zapier, and website chat. Green badge = done. Tap any card to jump to setup.",
    target: "#integrations-hub",
  },
  {
    id: "tech-dispatch",
    title: "🚚 Crew dispatch",
    description:
      "Add your techs and pick who is on-call each day. When a job confirms, they get a text — reply 1 to accept.",
    target: "#tech-dispatch",
  },
  {
    id: "go-live-contact",
    title: "📱 Verify your contact",
    description: "Register the email and phone that get new-request alerts. This is the first Go-live step.",
    target: "#go-live-contact",
  },
  {
    id: "go-live-schedule",
    title: "🕐 Answer hours",
    description: "Set when the AI answers for you (nights and weekends included).",
    target: "#go-live-schedule",
  },
  {
    id: "go-live-phone",
    title: "☎️ Connect your number",
    description:
      "Get your dedicated number and set up forwarding here to go live. Just signed up? Start with this step.",
    target: "#go-live-phone",
  },
  {
    id: "go-live-jobber",
    title: "🔗 Connect Jobber (optional)",
    description:
      "Already on Jobber? Connect it here to sync bookings and revenue automatically.",
    target: "#go-live-jobber",
  },
];
