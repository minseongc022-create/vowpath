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
export function getSettingsTourSteps(isEnglish: boolean): TourStep[] {
  if (isEnglish) {
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

  return [
    {
      id: "go-live-progress",
      eyebrow: "여기서 시작",
      title: "🎯 Go live 체크리스트",
      description:
        "아래 1→2→3→4 순서대로 진행하세요. 진행률 바가 전화 응대 시작 전 남은 단계를 보여줍니다.",
      target: "#go-live-progress",
    },
    {
      id: "integrations-hub",
      eyebrow: "한눈에 보기",
      title: "🔌 연동 맵",
      description:
        "전화, Jobber, Zapier, 웹 채팅 상태를 한눈에 확인합니다. 초록색 = 완료. 카드를 누르면 해당 섹션으로 이동합니다.",
      target: "#integrations-hub",
    },
    {
      id: "go-live-contact",
      eyebrow: "1단계 / 4 · 필수",
      title: "📱 연락처 확인",
      description:
        "먼저 새 요청 알림을 받을 이메일과 휴대폰 번호를 등록하세요. 저장하기 전까지 2·3단계는 잠겨 있습니다.",
      target: "#go-live-contact",
    },
    {
      id: "go-live-schedule",
      eyebrow: "2단계 / 4 · 필수",
      title: "🕐 AI 응대 시간",
      description:
        "다음으로 Effiroad가 전화를 받을 시간대를 정하세요. 야간·주말·상시 중에서 선택합니다.",
      target: "#go-live-schedule",
    },
    {
      id: "go-live-phone",
      eyebrow: "3단계 / 4 · 필수",
      title: "☎️ 착신전환 연결",
      description:
        "Effiroad 전용 번호를 받고, 메인 번호에서 안 받을 때 여기로 넘기세요. 고객은 기존 샵 번호 그대로 누릅니다.",
      target: "#go-live-phone",
    },
    {
      id: "go-live-jobber",
      eyebrow: "4단계 / 4 · 선택",
      title: "🔗 Jobber 연결",
      description:
        "선택 사항 — Jobber를 연결하면 승인된 작업이 일정·매출 대시보드에 자동 반영됩니다.",
      target: "#go-live-jobber",
    },
    {
      id: "product-settings",
      eyebrow: "Go live 이후",
      title: "⚙️ 샵 운영 설정",
      description:
        "Go live 단계가 끝나면, 아래에서 예약 규칙·크루 문자·추가 연동을 세밀하게 조정하세요.",
      target: "#product-settings",
    },
    {
      id: "shop-name",
      eyebrow: "운영 설정",
      title: "🏢 샵 이름",
      description: "통화·문자에 나오는 이름입니다. 실제 사업자명을 입력하세요.",
      target: "#shop-name",
    },
    {
      id: "shop-vertical",
      eyebrow: "운영 설정",
      title: "🔧 업종 선택",
      description: "Restoration 또는 HVAC — AI 응대 스크립트와 접수 질문이 맞춰집니다.",
      target: "#shop-vertical",
    },
    {
      id: "booking-settings",
      eyebrow: "운영 설정",
      title: "📅 예약 규칙",
      description:
        "일반 건은 자동 확정 vs. 먼저 문자로 승인 요청 중 선택합니다. 긴급·애매한 건은 항상 샵에 옵니다.",
      target: "#booking-settings",
    },
    {
      id: "tech-dispatch",
      eyebrow: "운영 설정",
      title: "🚚 크루 디스패치",
      description:
        "기사와 온콜 요일을 등록하세요. 작업 확정 시 문자가 가고, 1번 회신으로 수락합니다.",
      target: "#tech-dispatch",
    },
    {
      id: "settings-save",
      eyebrow: "마무리",
      title: "💾 모든 설정 저장",
      description:
        "변경 후에는 맨 아래 '모든 설정 저장'을 꼭 누르세요. 2·3단계도 저장해야 완료로 표시됩니다.",
      target: '[data-tour-step="settings-save"]',
    },
  ];
}

export const SETTINGS_TOUR_STEPS: TourStep[] = getSettingsTourSteps(true);
