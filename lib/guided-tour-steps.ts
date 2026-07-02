import type { TourStep } from "@/components/shared/GuidedTour";

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "new-request",
    title: "🆕 새 요청 직접 추가",
    description:
      "전화가 없어도 여기서 직접 새 서비스 요청을 등록할 수 있어요. 현장에서 바로 접수하거나 기존 고객 재방문을 기록할 때 씁니다.",
    target: '[data-tour-step="new-request"]',
  },
  {
    id: "pending-review",
    title: "⏳ 승인 대기 요청",
    description:
      "AI가 받은 통화에서 접수된 요청이 여기 쌓여요. ✓ 승인 / ✗ 거절을 누르면 고객에게 자동으로 SMS가 발송됩니다. 하루에 한 번만 확인해도 됩니다.",
    target: '[data-tour-step="pending-review"]',
  },
  {
    id: "revenue",
    title: "💰 매출 현황",
    description:
      "Jobber와 연동하면 수집된 매출을 기간별로 볼 수 있어요. 설정 → Jobber 연결에서 30초면 끝납니다.",
    target: '[data-tour-step="revenue"]',
  },
  {
    id: "recovery-metrics",
    title: "📊 복구 작업 지표",
    description:
      "수해·화재·곰팡이 현장별 진행 상황을 한눈에 파악해요. 어떤 손실 유형이 가장 많은지도 확인할 수 있어요.",
    target: '[data-tour-step="recovery-metrics"]',
  },
  {
    id: "kpi-cards",
    title: "📈 핵심 성과 지표 (KPI)",
    description:
      "처리된 통화 수, 대기 고객, 예약 건수를 실시간으로 파악하세요. 각 카드를 클릭하면 세부 내역이 펼쳐져요.",
    target: '[data-tour-step="kpi-cards"]',
  },
  {
    id: "trend-chart",
    title: "📉 통화 처리 추세",
    description:
      "Effiroad가 야간·부재중 통화를 얼마나 처리했는지 날짜별로 확인해요. 상단에서 7일·30일·90일 기간을 바꿔볼 수 있어요.",
    target: '[data-tour-step="trend-chart"]',
  },
  {
    id: "recent-requests",
    title: "📋 최근 서비스 요청",
    description:
      "가장 최근에 접수된 요청 목록이에요. 항목을 클릭하면 고객 이름·주소·이슈 유형·AI 요약을 자세히 볼 수 있어요.",
    target: '[data-tour-step="recent-requests"]',
  },
  {
    id: "upcoming-bookings",
    title: "📅 예정된 일정",
    description:
      "승인된 요청 중 아직 완료되지 않은 일정이 여기 표시돼요. 현장 출동 전 빠르게 오늘 스케줄을 확인하세요.",
    target: '[data-tour-step="upcoming-bookings"]',
  },
];

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    id: "shop-name",
    title: "🏢 업체 이름",
    description:
      "예약 문자·전화 응대 시 고객에게 들리는 이름이에요. 실제 상호명으로 입력해 주세요.",
    target: "#shop-name",
  },
  {
    id: "shop-vertical",
    title: "🔧 업종 선택",
    description:
      "업종(복원·HVAC·배관 등)에 따라 AI 응대 스크립트와 접수 질문이 자동으로 달라져요.",
    target: "#shop-vertical",
  },
  {
    id: "booking-settings",
    title: "📅 예약·방문 시간",
    description:
      "일반 요청은 AI가 바로 확정할지, 사장님 문자 승인을 거칠지 여기서 정해요. 긴급/애매한 건은 항상 문자로 확인받습니다.",
    target: "#booking-settings",
  },
  {
    id: "tech-dispatch",
    title: "🚚 기사 배정",
    description: "확정된 예약을 현장 기사에게 자동으로 문자로 보내는 설정이에요.",
    target: "#tech-dispatch",
  },
  {
    id: "go-live-contact",
    title: "📱 연락처 인증",
    description: "새 요청 알림을 받을 이메일·전화번호를 등록하는 단계예요. Go live의 첫 단계입니다.",
    target: "#go-live-contact",
  },
  {
    id: "go-live-schedule",
    title: "🕐 근무 시간",
    description: "AI가 언제 전화를 대신 받을지(야간·주말 포함) 스케줄을 설정하세요.",
    target: "#go-live-schedule",
  },
  {
    id: "go-live-phone",
    title: "☎️ 전화번호 연결",
    description:
      "여기서 전용 번호를 발급받고 착신전환을 설정하면 바로 운영을 시작할 수 있어요. 방금 가입하셨다면 이 단계부터 하시면 됩니다.",
    target: "#go-live-phone",
  },
  {
    id: "go-live-jobber",
    title: "🔗 Jobber 연동 (선택)",
    description:
      "쓰고 계신 CRM이 Jobber라면 여기서 연결해서 예약·매출을 자동으로 동기화할 수 있어요.",
    target: "#go-live-jobber",
  },
];
