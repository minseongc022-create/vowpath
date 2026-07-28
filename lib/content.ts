import { SITE, CHECKOUT_CTA } from "./constants";
import {
  planVolumeGuideKo,
  pricingVolumeTipKo,
  PRICING_GUARANTEES_KO,
  PRICING_TRANSPARENCY_FOOTNOTE_KO,
} from "./plan-volume-guide";
import {
  proUsageLine,
  scaleUsageLine,
  voiceProUsageLine,
  voiceStarterUsageLine,
} from "./plan-pricing";
import { IS_BETA } from "./beta";
import { pickLocaleCopy } from "@/lib/locale-merge";
import { runtimeUiLocale, type UiLocale } from "./locale";
import {
  authPagesEn,
  buildDashboardUiEn,
  dashboardPageEn,
  legalPagesEn,
  settingsPageEn,
  vowDashboardEn,
} from "./content-ui-en";
import {
  inboundCallsEn,
  jobCardGeneratorEn,
  jobberConnectEn,
  messagingSetupEn,
  phoneSetupEn,
} from "./content-dashboard-en";

export const hero = IS_BETA
  ? {
      badge: "퍼블릭 베타 · 미국 residential HVAC · 문자 승인",
      headline: "바쁜 날, 야간, 현장에서도",
      headlineAccent: "문자로 예약 확인",
      brandLine: "Efficiency + Road — 효율로 가는 길. 놓친 전화도 예약으로 이어집니다.",
      subhead:
        "고객 번호는 그대로. 못 받을 때·야간에만 Effiroad로 착신전환하면 AI가 전화·링크 접수를 받습니다. 접수 내용은 문자·이메일로 오고, 1=승인·2=거절만 답하면 됩니다.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "작동 방식 보기",
      note: "효율로 가는 길 · 무료 베타 · Jobber 연동은 선택",
      trustPills: [
        "스마트 자동 예약",
        "기존 업체 번호",
        "현장에서 문자 승인",
        "Jobber 선택",
      ] as const,
    }
  : {
      badge: "미국 residential HVAC · 문자로 예약 승인",
      headline: "밖에서 일할 때도",
      headlineAccent: "놓치지 않는 예약",
      brandLine: "Efficiency + Road — 효율적인 길. 놓친 전화를 놓치지 않습니다.",
      subhead:
        "메인 번호는 유지하고, 안 받으면·야간·주말에만 Effiroad로 넘깁니다. AI가 접수하면 문자·이메일로 요약이 오고, 1=승인·2=거절만 하면 고객 안내와 Jobber 기록이 이어집니다.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "제품 보기",
      note: `맞춤 시간대 · 정액 ${SITE.monthlyPrice}/월 또는 성과형 ${SITE.flexBasePrice}/월 + 승인 예약당 ${SITE.flexPerBooking}`,
      trustPills: [
        "스마트 자동 예약",
        "기존 업체 번호",
        "현장에서 문자 승인",
        "Jobber 선택",
      ] as const,
    };

export const about = {
  id: "about",
  badge: "브랜드 이름",
  title: "Efficiency + Road — 효율로 가는 길",
  subtitle: "The Road to Efficiency — 놓친 전화도 효율적으로 예약으로.",
  paragraphs: [
    "Effiroad는 Efficiency(효율)와 Road(길)의 합성어입니다. HVAC 업체가 바쁠 때도 전화·접수·승인·예약이 끊기지 않고 이어지는, 더 효율적인 운영의 길을 만듭니다.",
    "놓친 한 통은 경쟁업체로 가는 기회입니다. Effiroad는 그 길 위에서 한 건 한 건 쌓은 신뢰가 음성사서함에서 끊기지 않도록 돕습니다.",
  ],
  pillars: [
    {
      label: "Efficiency",
      meaning: "현장·야간에도 문자 한 통으로 승인 — 메뉴 여러 개 열지 않고 shop을 돌립니다.",
    },
    {
      label: "Road",
      meaning: "벨 울림 → 접수 → 문자 승인 → 예약까지 이어지는 길. 고객이 믿고 거는 전화가 끊기지 않게.",
    },
  ],
};

export const signupFlow = {
  title: "결제 후 10분 안에 연동",
  subtitle: "상담 없음. 결제 → 시간대 → 포워딩 → 문자 알림 시작 (Jobber는 선택).",
  steps: [
    {
      step: "01",
      title: "Lemon Squeezy 결제",
      description: `${SITE.monthlyPrice}/월. 결제 즉시 온보딩 화면으로 이동.`,
      time: "1분",
    },
    {
      step: "02",
      title: "AI 수신 시간대 설정",
      description:
        "요일·시간을 직접 지정. 예: 월–금 17:00–08:00, 토·일 종일, 피크 시 ‘바쁠 때만’.",
      time: "2분",
    },
    {
      step: "03",
      title: "콜 포워딩",
      description:
        "안 받으면·통화중·야간에 메인 번호 → Effiroad로 착신전환. 고객 번호는 바꾸지 않습니다.",
      time: "3분",
    },
    {
      step: "04",
      title: "휴대폰 문자 알림",
      description: "새 요청·긴급(P1)·1/2 승인·고객 확정 문자. Jobber는 원할 때만 연결.",
      time: "1분",
    },
  ],
};

export const differentiators = {
  title: "Effiroad가 하는 일",
  subtitle:
    "메인 번호는 그대로 두고, 못 받을 때만 Effiroad로 넘깁니다. 접수는 문자·이메일로, 1·2로 승인하면 고객 안내와 Jobber까지 이어집니다.",
  items: [
    {
      title: "메인 번호 그대로",
      description:
        "고객에게 보이는 번호는 지금 쓰는 업체 번호 하나. 홈페이지·구글 번호를 바꿀 필요 없습니다.",
    },
    {
      title: "조건부 착신전환",
      description:
        "안 받으면 / 통화중 / 몇 초 후 Effiroad로 전환. 야간·주말은 통신사 스케줄 또는 VoIP 시간 규칙으로 설정합니다.",
    },
    {
      title: "전화 or 링크 접수",
      description:
        "통화 중 전화로 접수할지, 링크로 접수할지 고객이 고릅니다. 연락처·주소·증상을 요약해 둡니다.",
    },
    {
      title: "문자·이메일로 확인",
      description:
        "접수가 들어오면 휴대폰 SMS가 먼저 옵니다. 같은 내용이 이메일로도 와서 PC에서 다시 볼 수 있습니다.",
    },
    {
      title: "1 / 2로 바로 승인",
      description:
        "현장·차 안에서 1=승인, 2=거절만 답하면 됩니다. 승인 시 고객에게 바로 확정 문자가 갑니다.",
    },
    {
      title: "Jobber 자동 기록 (선택)",
      description:
        "승인된 접수만 Jobber에 자동 등록. Jobber를 쓰지 않아도 문자·대시보드만으로 운영할 수 있습니다.",
    },
  ],
};

export const problem = {
  title: "현장 작업 중에도 콜은 계속 들어옵니다",
  subtitle:
    "피크 시즌 no-heat·no-cool 문의는 타이밍을 놓치기 쉽습니다. 음성사서함에 남기는 고객은 거의 없고, 대부분 바로 다른 업체로 전화합니다.",
  stats: [
    { value: "20–47%", label: "업계 조사 기준 부재중·놓친 인바운드 콜 비율" },
    { value: "$300+", label: "놓친 서비스 콜 1통당 예상 매출 손실" },
    { value: "~80%", label: "업계 조사 기준 음성사서함 → 경쟁업체 전환 비율" },
  ],
  callout: "긴급 job 1건만 살려도 월 구독료는 충분히 회수됩니다.",
};

export const howItWorks = {
  title: "작동 방식",
  subtitle: "메인 번호는 그대로 — 못 받을 때만 Effiroad로 넘기면 접수·승인·Jobber까지 이어집니다.",
  steps: [
    {
      step: "01",
      title: "착신전환 설정",
      description:
        "업체 번호는 그대로 둡니다. 안 받으면·통화중·야간·주말에 Effiroad로 착신전환합니다. 대시보드에서 AI 받을 시간도 함께 정합니다.",
    },
    {
      step: "02",
      title: "전화 or 링크 접수",
      description:
        "메뉴 1번=긴급 접수·출동, 2번=무료 견적(건당 $0). AI가 연락처·주소·증상을 요약해 둡니다.",
    },
    {
      step: "03",
      title: "문자·이메일 승인",
      description:
        "긴급 접수는 문자·이메일로 옵니다. 1=승인, 2=거절. 승인·스케줄 확정된 출동만 과금되고, 견적은 청구되지 않습니다.",
    },
  ],
};

export const features = {
  title: "업체에 필요한 것만",
  subtitle: "전화·링크 접수를 받고, 문자·이메일로 승인한 뒤 고객 안내와 Jobber까지 이어집니다.",
  items: [
    {
      title: "조건부 착신전환",
      description:
        "안 받으면 / 통화중 / 몇 초 후 Effiroad로 전환. 고객에게 보이는 번호는 업체 메인 번호 그대로입니다.",
    },
    {
      title: "전화 · 링크 접수",
      description:
        "긴급(1번) 또는 무료 견적(2번·건당 $0). 전화·링크 폼 모두 같은 흐름으로 이어집니다.",
    },
    {
      title: "SMS · 이메일 알림",
      description: "접수 요약이 휴대폰 문자로 옵니다. 같은 내용이 이메일로도 와서 한 번 더 확인할 수 있습니다.",
    },
    {
      title: "1 / 2 승인",
      description:
        "1=승인, 2=거절. 승인·스케줄된 긴급 출동만 과금 — 견적·스팸·취소는 제외.",
    },
    {
      title: "야간·주말 스케줄",
      description:
        "통신사 스케줄 착신전환 또는 VoIP·Jobber Phone 시간 규칙으로, AI가 받을 시간을 맞춥니다.",
    },
    {
      title: "Jobber (선택)",
      description: "승인된 접수만 Jobber에 자동 기록. 안 써도 문자·대시보드만으로 운영 가능합니다.",
    },
  ],
};

export const pricing = {
  title: "가격",
  subtitle:
    "과금 방식을 고르세요: 승인 긴급 출동 건당, 또는 포함 통화 분(Voice). 무료 견적은 모든 플랜 $0. 라이브 에이전트 전환 추가 수수료 없음.",
  billingTracks: {
    dispatch: {
      id: "dispatch" as const,
      label: "승인 출동 건당",
      hint: "실제 긴급 출동을 승인할 때만 과금 — 권장",
    },
    voice: {
      id: "voice" as const,
      label: "분당 과금",
      hint: "포함 통화 분 + 공개 초과 요금 — 전환 수수료 없음",
    },
  },
  compare: [
    { label: "맞춤 수신 시간대", amount: "무제한 구간" },
    { label: "무료 견적 전화 (메뉴 2)", amount: "포함 — 건당 $0", highlight: true },
    { label: "과금 선택", amount: "출동 트랙 또는 Voice 분", highlight: true },
    {
      label: "AI 품질",
      amount: "모든 플랜 프리미엄 AI",
    },
  ],
  plans: [
    {
      id: "lite" as const,
      name: "Lite",
      badge: "콜 적을 때",
      description: "월 기본료 최저. 프리미엄 AI. 출동 승인 시에만 추가 — 견적은 무료.",
      price: SITE.liteBasePrice,
      period: "/월",
      usageLine: `+ 승인 출동 1건당 ${SITE.litePerBooking} (견적 $0)`,
      volumeGuide: planVolumeGuideKo("lite"),
      features: [
        "무료 견적 전화 포함 ($0)",
        "프리미엄 AI 긴급 접수",
        `출동 승인 시에만 +${SITE.litePerBooking}`,
        "문자 승인 · Job Card · Jobber 선택",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Lite`,
    },
    {
      id: "flex" as const,
      name: "성과형 Flex",
      badge: "가장 많이 선택",
      description: "건당 단가 최적. 견적 무료 — 출동 승인할 때만 과금.",
      price: SITE.flexBasePrice,
      period: "/월",
      usageLine: `+ 승인 출동 1건당 ${SITE.flexPerBooking} (견적 $0)`,
      volumeGuide: planVolumeGuideKo("flex"),
      features: [
        "무료 견적 전화 포함 ($0)",
        "프리미엄 AI 접수·디스패치 노트",
        `Lite보다 낮은 건당 (${SITE.flexPerBooking})`,
        "콜만 받고 승인 0건 → 기본료만",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — 성과형`,
    },
    {
      id: "pro" as const,
      name: "Pro",
      badge: "성장 shop",
      description: "월 정액 + 프리미엄 AI. 견적 무료. 긴급 출동만 한도에 포함.",
      price: SITE.proPrice,
      period: "/월",
      usageLine: proUsageLine(false),
      volumeGuide: planVolumeGuideKo("pro"),
      features: [
        "무료 견적 전화 포함 ($0)",
        "프리미엄 AI 접수·Job Card",
        `월 ${SITE.proIncludedDispatches}건 긴급 출동 포함`,
        "80%/100% 알림 · Jobber 선택",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Pro`,
    },
    {
      id: "scale" as const,
      name: "Scale",
      badge: "피크 시즌",
      description: "프리미엄 AI + 고볼륨. 견적 무료. 피크 초과 요금 최저.",
      price: SITE.scalePrice,
      period: "/월",
      usageLine: scaleUsageLine(false),
      volumeGuide: planVolumeGuideKo("scale"),
      features: [
        "무료 견적 전화 포함 ($0)",
        "프리미엄 AI (모든 플랜 동일)",
        `월 ${SITE.scaleIncludedDispatches}건 긴급 출동 포함`,
        "Pro보다 낮은 초과 요금 · 피크용",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Scale`,
    },
  ],
  voicePlans: [
    {
      id: "voice_starter" as const,
      name: "Voice Starter",
      badge: "야간 콜 적을 때",
      description:
        "분당 과금 트랙. 포함 통화 분 + 공개 초과 요금 — 라이브 에이전트 전환 수수료 없음.",
      price: SITE.voiceStarterPrice,
      period: "/월",
      usageLine: voiceStarterUsageLine(false),
      volumeGuide: planVolumeGuideKo("voice_starter"),
      features: [
        "무료 견적 포함 ($0)",
        `월 ${SITE.voiceStarterIncludedMinutes}분 포함`,
        `이후 ${SITE.voiceStarterOveragePerMinute}/분 · 통화당 올림`,
        "동일 1/2 hold · CRM 선택",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Voice Starter`,
    },
    {
      id: "voice_pro" as const,
      name: "Voice Pro",
      badge: "야간·피크",
      description:
        "포함 분이 더 많은 분당 플랜. 출동 건당 대신 통화 분으로 맞추고 싶을 때.",
      price: SITE.voiceProPrice,
      period: "/월",
      usageLine: voiceProUsageLine(false),
      volumeGuide: planVolumeGuideKo("voice_pro"),
      features: [
        "무료 견적 포함 ($0)",
        `월 ${SITE.voiceProIncludedMinutes}분 포함`,
        `이후 ${SITE.voiceProOveragePerMinute}/분 · 초과 전 알림`,
        "출동 플랜과 동일한 접수·hold",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Voice Pro`,
    },
  ],
  tip: pricingVolumeTipKo(),
  footnote: PRICING_TRANSPARENCY_FOOTNOTE_KO,
  guarantees: PRICING_GUARANTEES_KO,
};

export const faq = {
  title: "자주 묻는 질문",
  items: [
    {
      q: "견적 전화도 건당 받나요?",
      a: "아니요. 무료 견적(메뉴 2번)은 모든 플랜에 포함이며 건당 $0입니다. 출동 과금·분당 Voice 모두 동일합니다.",
    },
    {
      q: "출동 과금이랑 분당 과금, 뭐가 다른가요?",
      a: "대부분 복구 shop은 출동 과금(Lite/Flex/Pro/Scale)이 맞습니다 — 긴급 출동 승인 시에만 냅니다. Voice Starter/Pro는 포함 통화 분 + 공개 초과 요금이 필요한 경우용이며, 라이브 에이전트 전환 수수료는 없습니다.",
    },
    {
      q: "성과형(Lite/Flex) 수수료는 언제 청구되나요?",
      a: "업체가 문자·대시보드로 긴급 출동을 승인(또는 스케줄 확정)한 1건당만 과금됩니다. 통화만 있고 승인이 없으면 기본료만, 무료 견적·스팸·취소는 제외합니다.",
    },
    {
      q: "Voice 분당 플랜은 어떻게 되나요?",
      a: `Voice Starter는 월 ${SITE.voiceStarterIncludedMinutes}분 포함 후 ${SITE.voiceStarterOveragePerMinute}/분, Voice Pro는 ${SITE.voiceProIncludedMinutes}분 후 ${SITE.voiceProOveragePerMinute}/분입니다. 통화당 올림. 접수·1/2 hold는 동일하고, Voice에서는 출동 승인으로 추가 과금하지 않습니다.`,
    },
    {
      q: "번호 두 개 써야 하나요?",
      a: "아니요. 고객에게는 지금 쓰는 메인 번호 하나만 보입니다. 통신사·VoIP에서 안 받으면·통화중이면·야간·주말에만 Effiroad 번호로 착신전환합니다. Effiroad 번호는 설정용이지, 사이트에 새로 올리는 번호가 아닙니다.",
    },
    {
      q: "낮 시간은 AI가 안 받나요?",
      a: "낮 9–5는 업체가 직접 받고, 저녁·주말·못 받을 때만 Effiroad로 넘깁니다. 착신전환을 ‘안 받을 때만’으로 두면 낮에는 평소처럼 연결됩니다.",
    },
    {
      q: "시간대는 어떻게 설정하나요?",
      a: "온보딩 후 대시보드에서 요일·시작·종료 시간을 추가합니다. 여러 구간(야간+점심+주말)을 동시에 둘 수 있습니다.",
    },
    {
      q: "상담 없이 바로 시작할 수 있나요?",
      a: "네. 결제 → 시간대 → 포워딩 → 휴대폰 번호 확인 순서입니다. Jobber는 선택입니다.",
    },
    {
      q: "Jobber 꼭 써야 하나요?",
      a: "아니요. 문자(SMS)로 신규 요청·1/2 승인·고객 안내가 메인입니다. 이미 Jobber를 쓰는 샵만 연동하면 승인 후 Request가 자동으로 들어갑니다.",
    },
    {
      q: "어떤 HVAC shop에 맞나요?",
      a: "미국 residential HVAC, owner-operator, 바쁜 날·야간·현장에서 휴대폰만으로 예약을 처리하고 싶은 shop입니다.",
    },
    {
      q: "예약은 어떻게 확정되나요?",
      a: "명확한 일반 건(P2/P3)은 달력에 자동 확정됩니다. P1 긴급이거나 이름·주소가 애매하면 사장님 문자 1=승인·2=거절 후 확정됩니다.",
    },
    {
      q: "정액이랑 성과형, 뭐가 다른가요?",
      a: `정액(${SITE.monthlyPrice}/월)은 설정 시간 내 콜·승인 예약이 무제한입니다. 성과형(${SITE.flexBasePrice}/월 + 예약 1건당 ${SITE.flexPerBooking})은 기본료만 낮고, 실제 승인한 예약만 수수료가 붙습니다.`,
    },
    {
      q: "성과형 수수료는 언제 청구되나요?",
      a: "업체가 문자·대시보드로 승인(확정)한 예약 1건당 과금됩니다. 통화만 있고 승인이 없으면 기본료만, 스팸·취소는 제외합니다.",
    },
  ],
};

export const footerKo = {
  privacy: "개인정보처리방침",
  terms: "이용약관",
  refund: "환불 정책",
  contact: "문의",
  tagline: "효율로 가는 길",
  brandMeaning:
    "Efficiency + Road — 효율적인 길. 벨 울림부터 예약까지, 더 효율적으로 이어집니다.",
  subline: "미국 residential HVAC · Jobber 연동 · 야간·주말 콜 접수",
};

export const cta = {
  eyebrow: "효율로 가는 길",
  title: "바쁠 때도, 문자 한 통으로",
  subtitle:
    "오늘 시간대·포워딩 설정하고, 내일부터 휴대폰으로 승인하세요. The road to efficiency starts here.",
  button: CHECKOUT_CTA,
};

export const getStartedPage = {
  eyebrow: "결제",
  title: "플랜 선택",
  subtitle: `Lemon Squeezy 안전 결제 · 정액 ${SITE.monthlyPrice}/월 또는 성과형 ${SITE.flexBasePrice}/월 + 예약당 ${SITE.flexPerBooking}`,
  canceledMessage: "결제가 취소되었습니다. 아래에서 플랜을 다시 선택해 주세요.",
  checkoutError:
    "결제를 시작하지 못했습니다. 아래 버튼으로 다시 시도하거나 회원가입으로 진행해 주세요.",
  demoNotice:
    "결제 연동 전입니다. 플랜을 고른 뒤 회원가입하면 연동 설정으로 이어집니다.",
  afterPay: "결제 완료 후 → 시간대·포워딩 설정 → 테스트 통화 (~10분) · Jobber 선택",
};

export const onboardingPage = {
  title: "Get set up",
  subtitle: "You're all paid up. Set your hours and call forwarding — then text alerts kick in.",
  paidBadge: "Paid",
  onboardingBadge: "Setup",
  stepLockedLabel: "Finish the previous step first",
  stepLabel: (n: number) => `Step ${n}`,
  stepDoneBadge: "· Done",
  stepOptionalBadge: "· Optional",
  stepDoneButton: "Done",
  scheduleHint: "Example: Mon–Fri 5pm–8am, all day Sat–Sun",
  scheduleSaveButton: "Save schedule",
  scheduleOnlyBack: "Back to dashboard",
  dashboardBackShort: "← Dashboard",
  jobberHint: "Sign in with OAuth — use your Jobber account or a test shop.",
  connectJobberButton: "Connect Jobber",
  backHome: "← Back to home",
  steps: [
    {
      id: "schedule",
      title: "When should Effiroad answer?",
      description:
        "Pick your days and times, or flip on 24/7. You can add more than one window.",
      action: "Save and continue",
      status: "ready" as const,
    },
    {
      id: "phone",
      title: "Set up call forwarding",
      description:
        "Add your Effiroad number in Dialpad or your phone system, follow the steps, and run a quick test.",
      action: "Continue",
      status: "ready" as const,
    },
    {
      id: "jobber",
      title: "Jobber (optional)",
      description:
        "Only if you already run on Jobber. You can handle everything from texts and the dashboard without it.",
      action: "Connect or skip",
      status: "ready" as const,
    },
  ],
  liveBanner:
    "Once your hours and forwarding are set, Effiroad picks up calls and texts you summaries. Jobber is optional.",
  forwardingNext: "Next: Jobber (optional)",
  jobberSkip: "Skip Jobber",
  skipToDashboard: "Finish later · skip to dashboard",
  support: `Questions? ${SITE.supportEmail}`,
  completeAction: "Go to dashboard",
};

const settingsPageKo = {
  title: "샵 설정",
  subtitle: "자동 예약 · 기사 배치 · PM 계약을 먼저 맞추고, 아래에서 라이브 체크리스트를 완료하세요.",
  badge: "설정",
  backDashboardLink: "← 대시보드로",
  productSectionTitle: "업체 종류 · 운영 설정",
  productSectionSubtitle:
    "먼저 업체 종류(복구 / HVAC)를 고르세요. 선택한 업종에 맞는 예약·자동 배차 규칙이 아래에 표시됩니다. 끝나면 오른쪽 위 저장을 누르세요.",
  bookingSectionTitle: "언제 기사에게 보내나요",
  shopOptional: {
    title: "선택 항목",
    summary: "PM 계약, 구글 리뷰, SMS 등록. 지금은 건너뛰어도 됩니다.",
    expandLabel: "펼치기",
    smsTitle: "SMS 등록 (미국)",
    smsBody:
      "대량 문자 전에 통신사 사업자 SMS 등록이 필요합니다. Effiroad는 Twilio 번호로 보냅니다 — Trust Hub에서 한 번만 등록하세요.",
    smsLink: "https://console.twilio.com/us1/develop/sms/trust-hub",
    smsLinkLabel: "Twilio Trust Hub 열기 →",
  },
  googleReview: {
    title: "구글 리뷰 링크",
    hint: "작업 완료 후 문자로 보냅니다. 비우면 보내지 않습니다.",
    placeholder: "https://g.page/r/...",
    invalidUrl: "https:// 로 시작하는 유효한 링크를 입력하세요.",
    saving: "저장 중…",
    saved: "저장됨",
  },
  goLiveSectionTitle: "라이브 체크리스트",
  goLiveSectionSubtitle: "순서대로만 따라오세요. 한 번 끝내면 문자 알림이 바로 시작됩니다.",
  goLiveWelcome: "10분이면 라이브!",
  goLiveWelcomeHint: "1→5단계. 각 페이지 채우고 ‘다음’ → 마지막에 오른쪽 위 ‘저장’.",
  goLiveNavContact: "연락처",
  goLiveNavSchedule: "응대 시간",
  goLiveNavPhone: "착신 전환",
  goLiveNavJobber: "Jobber",
  goLiveNavShop: "샵 운영",
  wizardStepOf: "{total}단계 중 {current}단계",
  wizardBack: "← 이전",
  wizardContinue: "다음 →",
  wizardLastStepHint: "바꾼 내용이 있으면 오른쪽 위 저장을 누르세요.",
  wizardStepComplete: "이 단계는 저장됐습니다 — 계속하거나 돌아가서 수정할 수 있어요.",
  wizardContactRequired: "위에 이메일·휴대폰을 입력하세요 (* 필수).",
  wizardScheduleRequired: "연락처를 먼저 완료한 뒤, 응대 시간을 하나 이상 고르세요.",
  wizardPhonePickPath: "먼저 퀴즈 또는 전체 목록에서 우리 샵 전화 경로를 선택하세요.",
  wizardPhoneRequired: "Effiroad 번호가 발급될 때까지 기다리거나 「번호 발급」을 누르세요.",
  contactRequiredMark: "필수",
  contactQuickTip: "💡 여기 번호로 새 요청·승인 문자가 옵니다. 1=승인, 2=거절만 답하면 됩니다.",
  scheduleQuickTip: "💡 이 시간에만 AI가 전화를 받습니다. 낮에는 평소처럼 직접 받을 수 있어요.",
  phoneQuickTip: "💡 고객이 보는 번호는 그대로 — 못 받을 때만 Effiroad로 넘깁니다.",
  jobberQuickTip: "💡 Jobber 쓰는 샵만 연결하세요. 없어도 문자·대시보드만으로 충분합니다.",
  paidBadge: "결제 완료",
  paidWelcome:
    "결제가 완료되었습니다. 연락처·응대 시간·착신 전환을 마치면 문자 알림을 받기 시작합니다.",
  progressTitle: "필수 {total}단계 중 {done}단계 완료",
  progressSummary: "필수 {total}단계 중 {done}단계 완료",
  progressHint: "업체 종류 → 연락처 → 응대 시간 → 착신 전환. Jobber는 선택.",
  scrollHint: "업체명 → 예약 → 기사 → PM → 라이브",
  tocLabel: "바로가기",
  tocContact: "연락처",
  tocSchedule: "응대 시간",
  tocPhone: "착신 전환",
  tocJobber: "Jobber",
  stepPrefix: (n: string) => `${n}단계`,
  prevButton: "← 이전",
  tabDone: "완료",
  contactTitle: "업주 연락처 (필수)",
  contactDescription:
    "새 요청·승인/거절 문자를 받을 미국 휴대폰과 이메일입니다. 문자가 기본, 이메일은 백업입니다.",
  contactIntro:
    "미국 HVAC·현장 서비스 업체용입니다. +1 휴대폰과 업무 이메일을 입력하세요.",
  contactIntroKr:
    "로컬 개발: 한국 010 또는 미국 +1. 운영 환경은 +1만 사용합니다.",
  contactEmailLabel: "이메일",
  contactEmailHint: "백업 알림 및 로그인에 사용됩니다.",
  contactPhoneLabel: "휴대폰 번호 (미국)",
  contactPhoneLabelKr: "휴대폰 번호 (한국 테스트)",
  contactPhoneHint:
    "새 요청 시 문자가 옵니다 — 1=승인, 2=거절. 예: (512) 555-0100",
  contactPhoneHintKr:
    "로컬 전용: 010 형식. Twilio 업그레이드 후 실제 문자 발송. 운영은 +1만 사용.",
  contactKrTestBanner:
    "한국 번호 테스트 모드입니다. Twilio 업그레이드 후 .env에서 SMS_DEV_PREVIEW를 끄면 실제 문자가 발송됩니다.",
  contactConfirm: "연락처 저장",
  contactSaving: "저장 중…",
  contactConfirmed: "연락처가 저장되었습니다. 문자·이메일 알림에 사용합니다.",
  contactLoadError: "연락처를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.",
  contactSaveError: "저장에 실패했습니다. 전화번호와 이메일 형식을 확인하세요.",
  contactLoading: "연락처 불러오는 중…",
  smsTwilioNotReadyTitle: "문자 발송이 아직 준비되지 않았습니다",
  smsTwilioDevPreview:
    "개발 모드: 실제 문자 미발송(SMS_DEV_PREVIEW). Twilio 업그레이드·번호 인증 후 .env에서 제거하세요.",
  contactPhoneNotUs:
    "전화번호 형식을 확인하세요. 한국: 010-XXXX-XXXX · 미국: (512) 555-0100",
  smsTwilioGeoHint:
    "Twilio 콘솔 → Messaging → Geo permissions → United States → Enable (오류 21408)",
  contactRequiredFirst: "먼저 연락처를 저장해 주세요.",
  nextContact: "다음: 연락처",
  nextPhone: "다음: 착신 전환",
  nextJobber: "Jobber (선택)",
  allDone:
    "라이브 상태입니다. 설정한 시간에 Effiroad가 전화를 받고, 검토가 필요하면 문자로 알려드립니다.",
  tabOptional: "선택",
  tabSkipped: "건너뜀",
  statusDone: "연결됨",
  statusPending: "설정 필요",
  editLabel: "수정",
  collapseLabel: "완료",
  manageLink: "연동 설정 관리",
  scheduleTitle: "응대 시간",
  scheduleDescription:
    "사무실이 비는 시간(퇴근 후, 주말, 점심 등)에 걸리는 전화를 Effiroad가 대신 받을 요일·시간을 정하세요. 예: 월–금 17:00~다음 날 08:00. 낮에도 항상 AI가 받게 하려면 「24시간 응대」를 켜세요. Effiroad 번호 사용 시: 지정 시간 밖이면 가게 전화로 연결됩니다. 통신사 착신전환이면 시간 밖에도 AI가 받아 메모/예약을 남깁니다.",
  scheduleAlwaysOn: "24시간 응대",
  scheduleAlwaysOnHint:
    "켜면 요일·시간과 관계없이 들어오는 전화를 모두 Effiroad가 받습니다. ③ 착신 전환도 24시간으로 맞추세요. 저장 전에는 창이 비어 있으면 AI가 받지 않습니다 — 시간대를 고른 뒤 저장하세요.",
  scheduleHourUnit: "시",
  scheduleMinuteUnit: "분",
  scheduleValidation: "24시간 응대를 켜거나, 시간대에 최소 하루를 선택하세요.",
  scheduleConfirm: "응대 시간 저장",
  scheduleConfirmed: "응대 시간이 저장되었습니다",
  scheduleWindowLabel: (n: number) => `시간대 ${n}`,
  scheduleRemove: "삭제",
  scheduleDaysLabel: "요일",
  scheduleStartLabel: "시작",
  scheduleEndLabel: "종료",
  scheduleAddWindow: "+ 시간대 추가",
  jobberTitle: "Jobber (선택)",
  jobberDescription:
    "이미 Jobber를 쓰는 경우에만 연결하세요. Jobber 없이도 문자·대시보드에서 검토·승인할 수 있습니다.",
  jobberScheduleAutoNote:
    "연결하면 승인·자동 확정된 예약이 Jobber 일정에 자동으로 반영됩니다. 별도 일정 연동 설정은 필요 없습니다.",
  jobberConnectedSummary: "연결됨: {account}",
  jobberConfirm: "연결 확인",
  jobberConfirmHint: "연결이 완료되면 자동으로 저장됩니다.",
  jobberConfirmed: "Jobber 연결이 저장되었습니다",
  jobberSkip: "Jobber 없이 계속",
  jobberSkippedNote: "Jobber를 건너뛰었습니다. 언제든 여기서 연결할 수 있습니다.",
  jobberPanel: {
    tagline: "승인·확정된 예약이 Jobber 일정에 자동 반영됩니다.",
    statusConnected: "연결됨",
    statusOptional: "선택",
    connectTitle: "Jobber 계정 연결",
    features: {
      requests: {
        title: "Request 자동 생성",
        body: "승인한 Job Card가 Jobber Request로 전송됩니다.",
      },
      schedule: {
        title: "일정 동기화",
        body: "확정된 방문 시간이 Jobber 캘린더에 바로 반영됩니다.",
      },
      optional: {
        title: "선택 연동",
        body: "Jobber 없이도 문자·대시보드에서 검토·승인할 수 있습니다.",
      },
    },
  },
  phoneTitle: "착신 전환",
  phoneDescription:
    "고객은 기존 샵 번호로 전화합니다. 퀴즈 또는 전체 목록에서 통신사·Dialpad·전용번호 중 검증된 경로를 고르세요.",
  forwardingNumberLabel: "Effiroad 번호",
  forwardingNumberHint:
    "Dialpad, VoIP 포털, 통신사 착신 전환 설정에 이 번호를 입력하세요. 고객은 여전히 메인 번호로 전화합니다.",
  forwardingNumberLoading: "번호 불러오는 중…",
  forwardingNumberMissing:
    "Effiroad 번호가 아직 없습니다. 아래 「번호 발급」을 눌러 전용 번호를 받으세요.",
  forwardingNumberProvisioning: "전용 번호 발급 중…",
  forwardingNumberProvision: "번호 발급",
  forwardingNumberProvisionFailed: "번호 발급에 실패했습니다. Twilio 잔액과 계정 설정을 확인하세요.",
  forwardingCopy: "번호 복사",
  forwardingCopied: "복사됨",
  forwardingCustomerNote:
    "고객에게 보이는 번호가 아닙니다 — 웹사이트·구글에는 기존 샵 번호를 그대로 노출하세요.",
  forwardingNumberBanner: {
    badgeOverflow: "Effiroad 번호",
    badgeDedicated: "메인 라인 번호",
    titleOverflow: "통신사·전화 앱에서 착신 전환 번호를 물을 때 이 번호를 붙여 넣으세요",
    titleDedicated: "고객이 보는 곳에 이 번호를 올리세요",
    bodyOverflow:
      "고객은 여전히 샵 번호로 전화합니다. 이 번호는 휴대폰·VoIP 설정 안에만 넣습니다 — 구글이나 웹사이트가 아닙니다.",
    bodyDedicated:
      "착신 코드 없음. 구글·웹·트럭에 이 번호를 올리면 됩니다. 응대 시간에 따라 Effiroad가 받습니다.",
    noteOverflow: "샵 번호는 구글·웹사이트에 그대로 둡니다.",
    noteDedicated: "옛 번호는 구글·간판 업데이트 전까지 개인 연락처에만 두면 됩니다.",
    carrierPasteHint: "앱에서 +1을 요구하면 {e164}를 사용하세요.",
    barHintOverflow: "Dialpad·통신사에서 착신 전환 번호를 물을 때 이 번호를 붙여 넣으세요.",
  },
  forwardingValueHero: {
    badge: "Effiroad가 다른 점",
    title: "샵 번호는 그대로. 놓치는 전화는 없게.",
    subtitle: "착신전환이든 전용번호든 같은 자연스러운 음성·접수·배차입니다.",
    bullets: [
      "고객은 **지금 쓰는 샵 번호**로 전화합니다. 내 폰이 먼저 ~20초 울리고, 못 받으면 Effiroad가 받습니다.",
      "명확한 일반 누수(P2/P3)는 자동 배차. 화재·오수·정보 부족은 **사장님 문자(1=진행, 2=거절)** 후 진행.",
      "복잡한 IVR 메뉴 없이 정중하게 접수하고, 대기 중 배차됩니다.",
    ] as const,
  },
  forwardingDoNowTitle: "지금 할 일",
  forwardingDoNowHint:
    "아래 순서대로 진행하세요. 고객 전화를 **실제로 받는 그 휴대폰**에서만 코드·앱 설정을 하세요. 각 단계 실행 후 ✓ 체크 → 맨 아래 **테스트 통화**.",
  forwardingMoreHelp: "추가 도움 (선택)",
  forwardingWizardSteps: {
    choosePath: "경로 선택",
    setUp: "착신전환 설정",
    testCall: "테스트 통화",
    testMode: "테스트 모드",
  },
  forwardingSetupPrompt:
    "아래에서 퀴즈(3문) 또는 전체 목록 중 편한 방법을 고르세요. 검증된 착신전환 경로만 표시합니다.",
  forwardingModeTabs: {
    quiz: "퀴즈 3문",
    menu: "전체 목록",
  },
  forwardingAiHelp: {
    badge: "AI 도움",
    title: "막히면 바로 물어보세요",
    subtitle: "착신전환·Dialpad·통신사 코드 — 우리 샵 설정 기준으로 답해 드립니다. (하루 제한 있음)",
    placeholder: "예: Verizon *71 눌렀는데 테스트가 실패해요",
    ask: "질문",
    sending: "…",
    quotaLabel: (remaining: number, limit: number) => `오늘 ${remaining}/${limit}회`,
    dailyLimitHit: "오늘 AI 착신전환 질문 한도에 도달했습니다. 내일 다시 이용하거나 아래 일반 AI를 사용하세요.",
    errorGeneric: "답변을 가져오지 못했습니다. 잠시 후 다시 시도하세요.",
    fullAiHint: "일반 Shop AI는 착신전환 외 업무 질문용입니다.",
    fullAiLink: "Shop AI 열기",
    quickQuestions: [
      "테스트 전화가 실패했어요 — 뭐부터 확인하나요?",
      "iPhone 착신전환 설정 써도 되나요?",
      "Dialpad에서 어디를 눌러야 하나요?",
      "*71 / **61* 코드가 안 먹혀요",
    ],
  },
  forwardingRestartPicker: "← 처음부터 다시 고르기 (퀴즈 / 전체 목록)",
  forwardingPathSelectedHint: "경로를 골랐습니다. 아래 단계를 따라한 뒤 테스트하세요.",
  forwardingAllOptions: {
    badge: "검증된 경로",
    title: "우리 샵 전화 — 어디로 오나요?",
    subtitle: "하나만 탭하세요. 아래에 맞춤 단계가 바로 나옵니다.",
    carrierSection: "샵 휴대폰 (내 폰 먼저 → 못 받으면 Effiroad)",
    voipSection: "업무 전화 / Jobber Phone / Dialpad",
    otherSection: "기타",
    googleVoiceHint: "GV 번호로 전화 — overflow는 불안정, 전체 전환 권장",
    dedicatedHint: "착신 코드 없음 — Effiroad 번호를 구글·웹에 게시",
    verifiedBadge: "검증됨",
    recommendedBadge: "추천",
    easiestBadge: "가장 쉬움",
    selectedNote: "선택됨 — 아래 단계를 이 휴대폰·포털에서 따라하세요.",
    changeLink: "다른 경로 고르기",
  },
  forwardingWhatYouAreSetting: "설정하는 내용",
  forwardingProviderTitle: "전화 환경 선택",
  forwardingProviderHint:
    "검증된 방법만 표시됩니다. 아래 번호 단계를 해당 휴대폰·포털에서 직접 따라야 합니다 — Effiroad가 원격으로 켤 수 없습니다.",
  forwardingDialpadBanner:
    "Jobber Phone / Dialpad 사용 시 권장 — Dialpad 웹에서 미응답 시 외부 번호로 설정 (별표 코드 아님).",
  forwardingVerizonWarning:
    "Verizon: *71 통화 버튼 먼저, 그다음 My Verizon. *72·iPhone 착신전환 설정은 금지.",
  forwardingGoogleVoiceWarning:
    "Google Voice는 ‘휴대폰 먼저 울리고 20초 후 Effiroad’ overflow를 안정적으로 지원하지 않습니다. 통신사 경로를 선택하거나 Effiroad 전용번호(가장 단순)를 쓰세요.",
  forwardingQuiz: {
    badge: "1단계 · 우리 샵 맞춤 찾기",
    title: "“우리는 어떻게 설정하지?”",
    subtitle: "질문 3개에 답하면 검증된 가이드 하나만 보여 드립니다 — 전화로 안내해 드리는 것과 같습니다.",
    progress: (current: number, total: number) => `질문 ${current} / ${total}`,
    manualPickLink: "이미 알고 있어요 — 목록에서 고르기 →",
    yourSetupBadge: "우리 샵 맞춤 설정",
    changeAnswers: "← 답 다시 고르기",
    whatYouNeedLabel: "필요한 것",
    methodLabel: "작동 방식",
    q1Label: "1. 고객이 지금 거는 번호는?",
    q1ShopCell: "샵 휴대폰",
    q1ShopCellHint: "AT&T, T-Mobile, Verizon, Xfinity 등 휴대폰으로 옵니다.",
    q1BusinessVoip: "업무 전화 시스템",
    q1BusinessVoipHint: "Dialpad, Jobber Phone, ServiceTitan, RingCentral, Grasshopper 등.",
    q1GoogleVoice: "Google Voice 번호",
    q1GoogleVoiceHint: "고객이 Google Voice 번호로 전화합니다.",
    q1Dedicated: "Effiroad 전용번호를 메인으로",
    q1DedicatedHint: "착신 코드 없음. 구글·웹·트럭에 Effiroad 번호만 올리면 됩니다.",
    q1Unsure: "잘 모르겠어요 — 전체 목록에서 고르기",
    q1UnsureHint: "AT&T, Verizon, Dialpad 등 9가지 검증 경로를 한 화면에 보여 드립니다.",
    q2CarrierLabel: "2. 그 휴대폰 통신사는?",
    q2Att: "AT&T / Cricket / Straight Talk",
    q2AttHint: "샵 폰에서 **61* 코드 한 번 (~2분).",
    q2Tmobile: "T-Mobile / Metro / Mint",
    q2TmobileHint: "샵 폰에서 **61* 코드 한 번 (~2분).",
    q2Verizon: "Verizon Wireless",
    q2VerizonHint: "*71 탭 버튼 — iPhone 설정 → 착신전환은 사용 금지.",
    q2Xfinity: "Xfinity Mobile",
    q2XfinityHint: "Verizon과 같은 *71 방식 — 샵 폰에서 한 번 탭.",
    q2VoipLabel: "2. 어떤 업무 전화 시스템?",
    q2Dialpad: "Dialpad / Jobber Phone / ServiceTitan Phones Pro",
    q2DialpadHint: "Dialpad 웹에서 미응답 → 외부 번호 (별표 코드 아님).",
    q2Ringcentral: "RingCentral",
    q2RingcentralHint: "관리자 포털에서 Effiroad 외부 번호로 전환.",
    q2Grasshopper: "Grasshopper",
    q2GrasshopperHint: "Grasshopper 설정에서 Effiroad로 내선/메인 전환.",
    q3Label: "3. Effiroad는 어떻게 받을까요?",
    q3Overflow: "지금 번호 유지 — 못 받으면 Effiroad로",
    q3OverflowHint: "내 폰이 먼저 울리고(~20초), 못 받으면 Effiroad. 직접 받는 전화는 그대로.",
    q3Dedicated: "Effiroad 전용번호를 메인 번호로",
    q3DedicatedHint: "착신 코드 없음. 구글·웹·트럭에 Effiroad 번호.",
    gvOverflowWarning:
      "Google Voice는 ‘휴대폰 먼저 → Effiroad’ overflow가 거의 안 됩니다. Effiroad 전용번호를 강력 권장합니다.",
    pathReady: "맞춤 가이드가 아래에 있습니다. 탭·복사 단계를 따라하세요.",
    showGuide: "가이드 보기",
    back: "← 이전",
    pathSummary: {
      effiroad_main: {
        headline: "맞춤: Effiroad 전용번호 (가장 쉬움)",
        body: "고객이 Effiroad 번호로 직접 전화합니다. 별표 코드·Dialpad 설정 없음. 구글·웹·트럭에 번호만 올리면 됩니다.",
        method: "고객이 보는 곳에 Effiroad 번호 게시 → 테스트 통화.",
        whatYouNeed: ["Google 비즈니스 프로필(권장)", "약 10분", "아래 Effiroad 번호"],
        timeLabel: "약 10분",
      },
      att: {
        headline: "맞춤: AT&T 샵 휴대폰 → 부재중 Effiroad",
        body: "고객 → 샵 휴대폰. ~20초 못 받으면 AT&T가 Effiroad로 넘깁니다.",
        method: "샵 폰에서 **61* 한 번 탭 → Effiroad 번호 붙여넣기.",
        whatYouNeed: ["샵 휴대폰", "2–5분", "아래 Effiroad 번호"],
        timeLabel: "약 5분",
      },
      tmobile: {
        headline: "맞춤: T-Mobile 샵 휴대폰 → 부재중 Effiroad",
        body: "T-Mobile 폰이 먼저 울림. 못 받으면 Effiroad로 자동 전환.",
        method: "샵 폰에서 **61* 탭 → Effiroad 번호.",
        whatYouNeed: ["샵 휴대폰", "2–5분", "아래 Effiroad 번호"],
        timeLabel: "약 5분",
      },
      verizon: {
        headline: "맞춤: Verizon 샵 휴대폰 → 부재중 Effiroad",
        body: "Verizon 폰이 먼저 울림. ~20초 후 Effiroad.",
        method: "아래 *71 버튼 탭 — iPhone 설정 착신전환 금지.",
        whatYouNeed: ["Verizon 샵 폰", "3–5분", "아래 Effiroad 번호"],
        timeLabel: "약 5분",
      },
      xfinity: {
        headline: "맞춤: Xfinity Mobile → 부재중 Effiroad",
        body: "Verizon과 같은 overflow: 내 폰 먼저 → 못 받으면 Effiroad.",
        method: "샵 폰에서 *71 스타일 코드 탭.",
        whatYouNeed: ["Xfinity 샵 폰", "3–5분", "아래 Effiroad 번호"],
        timeLabel: "약 5분",
      },
      dialpad: {
        headline: "맞춤: Dialpad / Jobber Phone → 미응답 Effiroad",
        body: "Dialpad에서 팀이 못 받으면 Effiroad로 넘깁니다.",
        method: "Dialpad 웹 → 미응답 → 외부 번호 → Effiroad (야간도 동일).",
        whatYouNeed: ["Dialpad 관리자 로그인", "약 15분", "아래 Effiroad 번호"],
        timeLabel: "약 15분",
      },
      ringcentral: {
        headline: "맞춤: RingCentral → 미응답 Effiroad",
        body: "RingCentral 미응답 전화를 Effiroad 외부 번호로.",
        method: "관리자 포털 → 통화 처리/전환 → 외부 번호.",
        whatYouNeed: ["RingCentral 관리자", "약 15분", "아래 Effiroad 번호"],
        timeLabel: "약 15분",
      },
      grasshopper: {
        headline: "맞춤: Grasshopper → Effiroad 전환",
        body: "Grasshopper 메인/내선을 Effiroad로 전환.",
        method: "Grasshopper 설정 → 전환 → Effiroad 번호.",
        whatYouNeed: ["Grasshopper 로그인", "약 10분", "아래 Effiroad 번호"],
        timeLabel: "약 10분",
      },
      google_voice: {
        headline: "맞춤: Google Voice → 전체 Effiroad 전환",
        body: "GV 번호로 오는 전화가 Effiroad로. ‘휴대폰 먼저’ overflow는 GV에서 불안정.",
        method: "voice.google.com → 설정 → 전화 → Effiroad로 전환.",
        whatYouNeed: ["Google Voice 로그인", "약 20분", "아래 Effiroad 번호"],
        timeLabel: "약 20분",
      },
    },
  },
  forwardingChangePath: "← 다른 설정 경로 선택",
  forwardingPathPicker: {
    badge: "1단계 · 전화 종류",
    title: "고객이 거는 번호는?",
    subtitle: "하나만 탭하세요. 착신전환 단계가 바로 아래에 나옵니다.",
    selectedLabel: "전화 종류: {type}",
    changeType: "변경",
    bestBadge: "가장 쉬움",
    pickCarrier: "샵 휴대폰 통신사는?",
    pickVoip: "업무 전화 시스템은?",
    back: "← 전체 경로로",
    quizFallback: "퀴즈로 맞춤 찾기 — 질문 3개 →",
    overflowFallbackHint:
      "이 통신사에서 착신전환이 안 되나요? Effiroad 전용번호를 쓰세요 — 같은 AI 음성, 같은 접수, 별표 코드 없음.",
    cardFallbackLine: "착신전환 불가? → Effiroad 전용번호 (품질 동일)",
    dedicatedFallbackTitle: "착신전환이 불가능하면 Effiroad 전용번호를 쓰세요",
    dedicatedEqualQuality:
      "하위 옵션이 아닙니다 — 고객이 Effiroad로 직접 전화해도 overflow와 같은 자연스러운 음성, 정중한 접수, 동일한 배차 규칙이 적용됩니다.",
    paths: {
      dedicated_line: {
        title: "Effiroad 전용번호",
        description: "착신 코드 없음. 구글·웹·트럭에 번호만 올리면 ~10분.",
        shortDescription: "착신전환 없음 — Effiroad 번호를 메인으로",
      },
      cell_overflow: {
        title: "샵 휴대폰",
        description: "내 폰이 먼저 울림. 못 받으면 Effiroad. AT&T/T-Mobile/Verizon/Xfinity.",
        shortDescription: "먼저 울림 → 못 받으면 Effiroad",
      },
      business_voip: {
        title: "Dialpad / Jobber Phone / RingCentral",
        description: "VoIP 관리자에서 미응답/Fallback → Effiroad 외부 번호.",
        shortDescription: "Dialpad·VoIP에 Effiroad 번호 붙여넣기",
      },
      google_voice: {
        title: "Google Voice",
        description: "GV가 메인일 때. 휴대폰 overflow는 불안정 — 아래 경고 참고.",
        shortDescription: "voice.google.com에서 전환",
      },
      quiz: {
        title: "도와줘",
        description: "질문 3개로 경로 찾기.",
      },
    },
  },
  forwardingAlternatePaths: {
    title: "이 경로가 안 되면 다음 시도:",
    hint: "착신전환이 전부 안 되면 Effiroad 전용번호로 전환 — 통화 품질 동일, 통신사 코드 불필요.",
    dedicatedLabel: "★ Effiroad 전용번호 (품질 동일)",
  },
  forwardingChangeProvider: "다른 전화 환경?",
  forwardingDedicatedLine: {
    badge: "Effiroad 전용번호",
    title: "착신전환과 같은 품질 — 코드 없음",
    body: "고객이 Effiroad 번호로 직접 전화합니다. 같은 자연스러운 AI 음성, 정중한 접수, 같은 배차 규칙 — 통신사 코드·VoIP 설정만 없습니다.",
    fallbackBadge: "착신전환이 안 되나요?",
    fallbackTitle: "Effiroad 전용번호를 대신 쓰세요",
    fallbackBody:
      "착신전환 경로를 다 시도했는데 테스트가 실패하나요? 구글·웹·트럭에 Effiroad 번호를 올리세요. 고객 경험은 완전히 같습니다 — 많은 샵이 이걸 선호합니다.",
    switchButton: "Effiroad 전용번호 쓰기 — 방법 보기",
    footer: "옛 번호는 구글·간판 업데이트 전까지 개인 연락처에만 두면 됩니다.",
    equalQualityNote:
      "overflow 착신전환과 동일한 AI 통화 품질 — 자연스러운 대화, 완전한 접수, 고객 대기 중 배차.",
    features: [
      "착신전환과 같은 전문 음성·접수 — 하위 옵션이 아닙니다.",
      "별표 코드·Dialpad admin 없음 — 고객이 Effiroad로 직접 전화.",
      "응대 시간으로 AI vs 내 폰 응답 조절.",
      "선불·법인·Google Voice 제한 없음.",
      "구글 비즈니스 프로필만 바꾸고 Effiroad 번호로 테스트.",
    ] as const,
  },
  forwardingDialpadVisual: {
    caption: "Dialpad · ServiceTitan Main Line (30초 요약)",
    hint: "Fallback → 외부 번호 → Effiroad → Closed Hours도 동일.",
    stepLabel: (n: number) => `${n}단계`,
  },
  forwardingTestFailedDedicated:
    "다 해봤는데 테스트가 계속 실패? Effiroad 전용번호로 전환하세요 — 착신전환 불필요.",
  forwardingUnblockTitle: "막히면 — 상황별 해결",
  forwardingUnblockHint:
    "본인 상황을 펼쳐 보세요. 선불·법인·음성사서함·앱 메뉴 없음 등 검증된 우회 경로입니다.",
  forwardingCarrierCallLabel: "통신사 문의:",
  forwardingStepsTitle: "단계별 가이드 (순서대로)",
  forwardingTestTitle: "테스트 통화",
  forwardingServiceDisclaimer:
    "Effiroad는 통화가 항상 연결된다고 보장하지 않습니다. 테스트 통화로 착신전환을 확인하세요. 출동·고객 응대의 최종 책임은 업체에 있습니다.",
  forwardingOneTapTitle: "탭 또는 열기 — 완료에 체크",
  forwardingOneTapHint:
    "고객 전화를 받는 **그 휴대폰** 또는 컴퓨터에서 아래 버튼을 누르세요. *72·**21*·iPhone 설정 착신전환은 사용하지 마세요.",
  forwardingTapToActivate: "이 휴대폰에서 코드 통화",
  forwardingCopyNumber: "Effiroad 번호 복사",
  forwardingTurnOff: "이 규칙 끄기",
  forwardingStepDone: "완료 — 실행함",
  forwardingOneTapComplete: "설정 단계 완료. 테스트 통화로 이동하세요.",
  forwardingOneTapProgress: "각 단계 실행 후 체크 — 그다음 테스트.",
  forwardingTestBody:
    "테스트 시작 → **다른 폰**으로 **샵 메인 번호**에 전화 → **받지 않고 20~25초** 울리게 두세요. Effiroad가 받으면 성공입니다.",
  forwardingTestBodyDirect:
    "테스트 시작 → **다른 폰**으로 **Effiroad 번호**에 직접 전화하세요. 착신 코드 없이 Effiroad가 받아야 합니다.",
  forwardingVerifyCallEffiroad: "이 Effiroad 번호로 전화:",
  forwardingVerifyWaitingDirect: "대기 중 — 지금 Effiroad 번호로 전화하세요",
  forwardingVerifyStart: "착신전환 테스트 시작",
  forwardingVerifyListening: "테스트 전화 대기 중…",
  forwardingVerifyWaiting: "대기 중 — 지금 샵 번호로 전화하세요",
  forwardingVerifyCallShop: "이 번호(샵 메인)로 전화:",
  forwardingVerifyNotEffiroad: "Effiroad 라우팅 번호는 걸지 마세요:",
  forwardingVerifySuccess: "착신전환 성공 — Effiroad가 테스트 전화를 받았습니다.",
  forwardingVerifySuccessInboundOnly:
    "Effiroad로 전화가 들어왔습니다. 샵 번호 경유 여부는 확인되지 않았습니다 — Effiroad가 아닌 샵 번호로 걸고 받지 않은 채 울리게 하세요.",
  forwardingVerifyWrongForward:
    "전화는 들어왔지만 통신사가 다른 착신 경로를 보고했습니다. 샵 휴대폰에서 코드를 실행했는지, 연락처의 샵 번호가 맞는지 확인하세요.",
  forwardingVerifyError: "테스트를 시작하지 못했습니다. 다시 시도하세요.",
  forwardingVerifyRequired: "확인 전에 위 착신전환 테스트를 완료하세요.",
  forwardingRecommended: "인기",
  forwardingRecommendedProvider: "권장",
  forwardingConfirmBlocked: "Effiroad 번호가 연결되어야 이 단계를 완료할 수 있습니다.",
  phoneGuide: "",
  phoneSupport: "",
  phoneConfirm: "착신 전환 확인 — 테스트 완료",
  phoneConfirmed: "착신 전환 설정 완료",
  forwardingDevTitle: "개발자 · Twilio 테스트",
  forwardingDevHint:
    "로컬 Twilio 연결 및 통화 시뮬레이션용입니다. 실제 샵은 위 가이드만으로 충분합니다.",
  bookingPolicyTitle: "예약 · 일정",
  bookingPolicyMode: "고객 시간 선택",
  bookingSchedulingEnabledLabel: "고객이 달력에서 시간 고르기",
  bookingSchedulingModeLabel: "예약 방식",
  ownerApprovalSmsLabel: "사장님 승인 문자",
  ownerApprovalSmsHint: "수동 승인이 필요한 예약에만 적용됩니다.",
  bookingSavedLabel: "저장됨",
  bookingLoadingLabel: "불러오는 중…",
  bookingTryAgainLabel: "다시 시도",
  bookingPolicyDescription:
    "스마트 자동 예약: 명확한 일반 건(P2/P3)은 바로 확정. 긴급(P1)이나 정보가 애매하면 사장님 문자(1/2) 후 확정.",
  smartAutoBookingTitle: "예약 방식",
  smartAutoBookingIntro: "모드 선택 없이 한 가지 정책으로 동작합니다.",
  smartAutoBookingRules: [
    "이름·주소·증상이 분명한 P2/P3 → 달력에 자동 확정.",
    "P1 긴급(난방/냉방/안전) → 항상 사장님 승인 대기.",
    "정보 불명확·신뢰도 낮음 → 1(승인)/2(거절) 문자 후 확정.",
    "자동 확정 후 마음 바뀌면 undo 시간 안에 9번 회신.",
  ] as readonly string[],
  visitTimingTitle: "예약 간격",
  visitTimingHint:
    "고객에게 보이는 방문 시작 시각 간격입니다. 예: 2시간 → 8시, 10시, 12시… (이동 시간은 자동으로 반영됩니다).",
  visitHoursTitle: "고객 예약 시간대",
  visitHoursHint:
    "고객 방문 예약 시간대입니다 (월–토). AI 전화 응답 시간과는 별개입니다 — 오전·오후 블록 또는 하루 연속으로 설정하세요.",
  visitHoursLayoutLabel: "시간표 방식",
  visitHoursLayoutSplit: "오전 · 오후",
  visitHoursLayoutContinuous: "하루 연속",
  visitHoursAmLabel: "오전 블록",
  visitHoursPmLabel: "오후 블록",
  visitHoursContinuousStartLabel: "영업 시작",
  visitHoursContinuousEndLabel: "마지막 슬롯 종료",
  visitHoursToLabel: "~",
  visitHoursExample: (am: string, pm: string) =>
    `예: 다음 영업일 ${am}, ${pm} 슬롯이 보입니다.`,
  visitHoursExampleContinuous: (range: string) =>
    `예: 다음 영업일 ${range} 슬롯이 연속으로 보입니다.`,
  appointmentIntervalLabel: "슬롯 간격 (고객에게 보이는 시작 시각)",
  appointmentIntervalHint:
    "예약을 이 간격으로 제안합니다. 작업 시간 + 이동 시간이 자동으로 맞춰져, 기사가 겹치지 않습니다.",
  appointmentIntervalExample: (hours: number, minutes: number) =>
    minutes > 0
      ? `예: 8시 예약 → 다음은 ${8 + hours}시 ${minutes}분 (${hours}시간 ${minutes}분 간격).`
      : `예: 8시 예약 → 다음은 ${8 + hours}시 (${hours}시간 간격).`,
  appointmentIntervalPresets: ["1시간", "1.5시간", "2시간", "3시간"] as const,
  travelMinutesLabel: "기사 이동 시간",
  travelMinutesHint:
    "한 방문이 끝난 뒤 다음 집까지 이동·주차 시간입니다. 슬롯 간격을 바꾸지 않고 이동만 조정하면 작업 길이가 자동 보정됩니다.",
  travelMinutesFieldLabel: "이동 시간 (분)",
  teamCapacityTitle: "동시에 여러 팀 (선택)",
  teamCapacityHint:
    "기사 1명이면 1로 두세요. 같은 시각에 서로 다른 작업을 여러 팀이 동시에 할 수 있을 때만 올리면 됩니다.",
  maxConcurrentVisitsLabel: "같은 시간에 받을 수 있는 예약 (건)",
  maxConcurrentVisitsHint:
    "같은 시간대에 몇 건까지 받을지 정합니다. 예: 기사 3명이면 3까지 설정.",
  undoWindowLabel: "자동 확정 후 취소 가능 시간 (분)",
  undoWindowHint:
    "시스템이 예약을 바로 확정하면 사장님께 알림 문자가 갑니다. 이 시간 안에 문자로 9를 답하면 확정을 취소하고 다시 검토할 수 있습니다.",
  shadowModeLabel: "테스트 모드",
  shadowModeIntro:
    "실전과 같은 캘린더·슬롯으로 연습합니다. Jobber 기록과 실제 고객 문자는 꺼집니다.",
  shadowModeLive: "꺼짐 — 실전: 실제 문자·캘린더·Jobber 반영",
  shadowModePractice: "켜짐 — 연습: SMS에 [TEST], Jobber 기록 없음",
  testModeTitle: "테스트 모드",
  testModeIntro:
    "실전처럼 통화·접수를 연습합니다. 고객 문자는 [TEST] 표시되고 Jobber는 꺼집니다. 라이브 전에 꺼 주세요.",
  testModeOn: "테스트 모드 켜짐 — 아직 라이브 아님",
  testModeOff: "라이브 — 실제 디스패치·고객 문자",
  testModeLoading: "테스트 모드 불러오는 중…",
  testModeSaveError: "테스트 모드를 저장하지 못했습니다. 다시 시도하세요.",
  testModeForwardingHint:
    "테스트 모드를 켠 뒤 다른 휴대폰으로 샵 번호에 전화하고 대시보드를 확인하세요. 준비되면 끄면 라이브입니다.",
  stormModeLabel: "폭주·재해 모드 (전화 많을 때)",
  stormModeHint:
    "허리케인·집중 호우처럼 전화가 몰릴 때 켭니다. 안내를 짧게 하고 대기 중임을 알립니다. 평소에는 끄세요.",
  stormModeToggleLabel: "폭주·재해 모드 켜기",
  onCallScheduleLabel: "요일별 당직 기사",
  onCallScheduleHint:
    "요일마다 첫 출동 문자를 받을 기사를 지정합니다. 비우면 순서대로(라운드로빈) 보냅니다.",
  onCallWeekdayLabels: ["일", "월", "화", "수", "목", "금", "토"] as const,
  onCallNoneOption: "순서대로 (기본)",
  serviceAreaZipsLabel: "출장 가능 ZIP (선택)",
  serviceAreaZipsHint:
    "실제로 출장하는 ZIP 목록입니다 (고객 한 집 주소 아님). 쉼표로 구분. 비우면 전 지역 허용.",
  serviceAreaZipsPlaceholder: "78701, 78702, 78745",
  techDispatchTitle: "기사 배치",
  techDispatchNav: "기사 배치",
  saveAllButton: "저장",
  saveAllSaving: "저장 중…",
  saveAllSuccess: "모든 설정이 저장되었습니다.",
  saveAllHint: "위에서 바꾼 뒤, 맨 아래에서 한 번에 저장하세요.",
  saveAllError: "일부 설정을 저장하지 못했습니다. 입력값을 확인하고 다시 시도하세요.",
  bookingNav: "예약 설정",
  techDispatchSummary:
    "예약 확정 시 기사에게 문자로 순차 제안합니다. 1=수락, 2=패스. 한 명씩만 연락합니다.",
  agreementNav: "PM 계약",
  shopNameNav: "업체 이름",
  shopName: {
    label: "업체 이름",
    hint: "예약 문자·전화 응대 시 고객에게 들리는 이름입니다. 예: \"쿨에어 HVAC에 연락 주셔서 감사합니다.\"",
    placeholder: "쿨에어 HVAC",
    save: "업체 이름 저장",
    saving: "저장 중…",
    saved: "저장됨 — 문자·전화에서 이 이름을 사용합니다.",
    loading: "불러오는 중…",
    loadError: "업체 이름을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.",
    saveError: "저장에 실패했습니다. 다시 시도하세요.",
    required: "업체 이름을 입력하세요.",
  },
  agreementKeeper: {
    title: "PM 계약 관리",
    summary:
      "작업 완료 시 유지보수 계약을 문자로 제안합니다. 갱신일을 추적하고 만료 전에 알림을 받습니다.",
    enabledLabel: "PM 계약 관리 사용",
    offerAfterComplete: "작업 완료 시 유지보수 계약 SMS 제안",
    defaultPlan: "기본 플랜 이름",
    defaultPrice: "연간 요금 (USD)",
    visitsPerYear: "연간 점검 횟수",
    offerExpires: "제안 링크 만료 (일)",
    reminderHint: "사장님 알림: 갱신 60/30/7일 전 · 고객 알림: 30/7일 전",
    loading: "불러오는 중…",
    saving: "저장 중…",
    save: "PM 설정 저장",
    saved: "저장됨",
  },
  ownerAlertsTitle: "알림 방식",
  ownerAlertsDescription:
    "문자(기본): 새 요청, 확정 알림, 1=승인 · 2=거절 · 9=최근 예약 취소. 이메일: 백업. Jobber 연결 시 일정은 자동 동기화됩니다.",
  auditTitle: "활동 기록",
  auditDescription: "최근 30일 승인·거절·접수 이벤트",
  auditEmpty: "아직 기록이 없습니다. 요청을 승인하거나 거절하면 여기에 표시됩니다.",
  auditRefresh: "새로고침",
  auditViewBooking: "보기",
  opsFailuresTitle: "최근 오류",
  opsFailuresDescription:
    "Twilio, AI, Jobber, 접수 실패 기록입니다. 동일 오류는 시간당 한 번만 기록됩니다.",
  opsFailuresTwilioHint:
    "문자 실패 시: Twilio 미국 SMS 권한, 업주 연락처(+1), 트라이얼 인증 번호를 확인하세요. 터미널에서 npm run sms:diagnose 실행.",
  opsFailuresRetryable: "재시도 가능",
  opsFailuresRepeatCount: (n: number) => `동일 오류 ${n}회`,
  opsFailuresClear: "기록 지우기",
  opsFailuresClearConfirm: "이 계정의 모든 오류 기록을 지울까요?",
  storageTitle: "서버 저장소",
  storageOk: "저장소 연결됨",
  storageRequired: "운영 환경에 저장소 필요",
  storageStep1: "Vercel → Storage → Create database → KV",
  storageStep2: "이 프로젝트(effiroad)에 연결",
  storageStep3: "Deploy → Redeploy",
  storageDocHint: "자세한 내용: 프로젝트 루트 KV_SETUP.md",
  backDashboard: "대시보드로",
  backHome: "← 홈으로",
  liveBanner: "연락처·응대 시간·착신 전환을 마치면 전화 응대와 문자 알림이 시작됩니다",
  support: "문의: {email}",
  sectionSteps: {
    shop: "1",
    contact: "2",
    schedule: "3",
    phone: "4",
    jobber: "5",
  } as const,
};

const vowDashboardKo = {
  nav: {
    dashboard: "대시보드",
    briefing: "오늘 브리핑",
    ai: "Effiroad AI",
    requests: "요청 · 예약",
    quotes: "견적 · 후속",
    chase: "후속",
    calendar: "캘린더",
    missedCalls: "지켜낸 콜",
    agreements: "유지보수 계약",
    settings: "샵 설정",
    shopTools: "샵 도구",
    allMenus: "전체 메뉴",
  },
  calendar: {
    title: "일정 캘린더",
    subtitle: "날짜를 누르면 그날 예약 목록이 나오고, 예약을 누르면 상세 정보를 볼 수 있습니다.",
    refresh: "새로고침",
    loading: "불러오는 중…",
    prevMonth: "이전 달",
    nextMonth: "다음 달",
    today: "오늘",
    noEventsDay: "예약 없음",
    selectDay: "날짜를 선택하면 그날 예약 목록이 여기에 표시됩니다.",
    dayEventsTitle: (count: number) => `예약 ${count}건`,
    noEventsOnDay: "이 날에는 예약이 없습니다.",
    backToDayList: "← 목록으로",
    eventCount: (count: number) => `${count}건`,
    sourceEffiroad: "Effiroad 확정",
    sourceJobber: "Jobber",
    customer: "고객",
    phone: "연락처",
    address: "주소",
    issue: "요청 내용",
    time: "방문 시간",
    priority: "긴급도",
    viewBooking: "요청 상세 보기",
    close: "닫기",
    effiroadBookings: "Effiroad 확정",
    jobberCalendar: "Jobber 일정",
    emptyNative: "아직 Effiroad에 확정된 방문이 없습니다.",
    emptyJobber: "Jobber 일정이 없거나 연동이 필요합니다.",
    weekdays: ["일", "월", "화", "수", "목", "금", "토"] as const,
  },
  upgrade: {
    title: "플랜 업그레이드",
    body: "야간·주말 무제한 AI 수신과 문자 승인을 한 번에.",
    cta: "플랜 보기",
    viewLanding: "랜딩 보기",
  },
  agreements: {
    eyebrow: "PM 계약 관리",
    title: "콜은 잡고, 계약은 지킨다",
    subtitle:
      "완료된 작업을 유지보수 계약으로 전환하세요. 갱신일 추적, CSV 가져오기, 만료 전 SMS 알림.",
    settingsLink: "PM 설정",
    addButton: "계약 추가",
    kpiActive: "활성 계약",
    kpiRenewing: "30일 내 갱신",
    kpiMrr: "예상 월 반복 매출",
    filters: { all: "전체", active: "활성", renewing: "갱신 임박" },
    importCsv: "CSV 가져오기",
    importing: "가져오는 중…",
    loading: "계약 불러오는 중…",
    emptyTitle: "아직 유지보수 계약이 없습니다",
    emptyBody: "작업 완료 시 자동 제안, CSV 가져오기, 또는 아래에서 직접 추가해 시작하세요.",
    emptyCta: "계약 추가",
    statusActive: "활성",
    statusDraft: "초안",
    statusCancelled: "취소됨",
    statusExpired: "만료",
    statusPaused: "일시중지",
    colCustomer: "고객",
    colPlan: "플랜",
    colRenewal: "갱신일",
    colStatus: "상태",
    colPrice: "연간",
    daysLeft: (n: number) => `${n}일 남음`,
    addTitle: "새 유지보수 계약",
    fieldName: "고객 이름",
    fieldPhone: "전화번호",
    fieldAddress: "서비스 주소",
    fieldPlan: "플랜 이름",
    fieldStart: "시작일",
    fieldRenewal: "갱신일",
    fieldPrice: "연간 요금 (USD)",
    fieldVisits: "연간 방문 횟수",
    cancel: "취소",
    save: "저장",
    saving: "저장 중…",
    saved: "저장됨",
    saveError: "저장하지 못했습니다. 다시 시도하세요.",
    loadError: "계약을 불러오지 못했습니다.",
    importDone: (n: number, skipped: number) =>
      `${n}건 가져옴${skipped ? ` (${skipped}건 건너뜀)` : ""}.`,
    importError: "가져오기 실패. CSV 열을 확인하세요.",
    close: "← 닫기",
    cancelAgreement: "계약 취소",
    renewOneYear: "1년 갱신",
  },
  briefingPage: {
    title: (shop: string) => `오늘의 브리핑 — ${shop}`,
    subtitle:
      "요청·승인·긴급 건을 빠르게 확인하세요. 요약은 어제 기준, 아래 지표는 오늘 현재입니다.",
    aiSummary: "AI 요약",
    refreshing: "새로고침 중…",
    urgentTitle: "긴급 요청",
    pendingTitle: "검토 대기",
    viewAll: "전체 보기",
    review: "검토하기",
    retry: "다시 시도",
    noUrgent: "긴급 요청이 없습니다.",
    noPending: "검토 대기 요청이 없습니다.",
    noRequestedTime: "희망 시간 없음",
  },
  bookingsList: {
    back: "← 대시보드로",
    title: "요청 · 예약",
    subtitle: "들어온 요청과 승인 상태를 모두 확인합니다.",
  },
  quotesHub: {
    back: "← 대시보드로",
    title: "견적 · 후속",
    subtitle: "열린 견적과 자동 후속 문자를 한곳에서 관리합니다.",
    tabOpen: "열린 견적",
    tabChase: "후속",
  },
  quotes: {
    back: "← 대시보드로",
    title: "견적",
    subtitle: "현장에서 마무리하거나 보내야 할 견적·리드 — 약속만 남기지 말고 숫자를 남기세요.",
    chaseLink: "후속 큐",
    kpiOpen: "열린 견적",
    tip: "요청 열기 → 현장에서 라인 아이템 작성 → 고객에게 링크 문자. 금액 견적을내면 자동 후속이 시작됩니다.",
    loading: "견적 불러오는 중…",
    emptyTitle: "열린 견적 없음",
    emptyBody: "2번 견적 전화와 링크 인테이크는 견적을 보낼 때까지 여기에 표시됩니다.",
    unnamed: "고객",
    noAmount: "금액 입력",
    stages: {
      lead: "리드",
      draft: "초안",
      ready: "발송 준비",
      sent: "발송됨",
      chasing: "후속 중",
      booked: "예약됨",
      closed: "종료",
    },
  },
  chase: {
    back: "← 대시보드로",
    title: "후속",
    subtitle: "문자로 보냈지만 아직 예약 안 된 견적 — 48시간, 7일, 14일에 자동 리마인드(SMS 동의 시).",
    quotesLink: "견적",
    kpiActive: "후속 중",
    kpiDue: "지금 발송",
    schedule: "자동 SMS: 견적 발송 후 48h · 7d · 14d",
    loading: "후속 큐 불러오는 중…",
    emptyTitle: "후속할 항목 없음",
    emptyBody: "견적을 문자로내면 고객이 예약하거나 모든 후속이 끝날 때까지 여기에 표시됩니다.",
    unnamed: "고객",
    sent: "견적 발송",
    dueNow: "후속 예정",
    next: "다음 리마인드",
    complete: "후속 완료",
  },
  quoteChasePromo: {
    aria: "견적 및 후속 (기본 포함)",
    eyebrow: "기본 포함",
    title: "견적 · 후속 (기본 기능)",
    body: "필요할 때만: 현장 견적과 선택적 SMS 리마인드. 메인 기능은 전화 응대입니다.",
    quotesCta: "견적 열기",
    chaseCta: "후속 큐",
  },
  header: {
    newRequest: "새 요청",
    dateRange: (start: string, end: string) => `${start} – ${end}`,
    dateQuick: "빠른 선택",
    dateCustom: "직접 선택",
    dateFrom: "시작일",
    dateTo: "종료일",
    dateApply: "적용",
    dateInvalid: "시작일은 종료일보다 이전이어야 합니다.",
    subtitle: "오늘 AI 전화 비서 활동 요약입니다.",
    simulateWorking: "AI 처리 중… (10~20초)",
    simulateDone: "테스트 요청이 생성되었습니다. 목록을 새로고침합니다.",
    simulateFail: "요청 생성 실패. 로그인·dev 서버를 확인하세요.",
  },
  hero: {
    period: "이번 달",
    tagline: "야간·피크 콜을 문자로 확인·승인합니다.",
    callsSaved: "지켜낸 고객",
    aiAnswered: "AI 응답 콜",
    emergency: "긴급 요청",
    deltaFlat: "전월 동기간과 동일",
    delta: (pct: number) => `전월 동기간 ${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`,
  },
  secondary: {
    hint: "한눈에",
    body: "위 숫자는 실제 통화 기록 기준입니다. 새 요청은 아래 목록에서 바로 확인하세요.",
  },
  kpi: {
    missedPrevented: "지켜낸 고객",
    emergency: "긴급 요청",
    conversion: "예약 전환율",
    aiAnswered: "AI 응답 콜",
    vsPrior: (pct: number, period: string) =>
      pct === 0 ? `${period} · 전월 동기간과 동일` : `${period} · 전월 동기간 ${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`,
  },
  compareLabel: "이번 달",
  trend: {
    title: "기간별 추세",
    last30: "최근 30일 · 일별",
    viewDetail: "상세 보기",
  },
  insights: {
    title: "통화 인사이트",
    thisMonth: "이번 달",
    delta: (pct: number) => (pct === 0 ? "—" : `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`),
  },
  recentRequests: {
    title: "최근 요청",
    subtitle: "새 고객 문의 — 우선 확인",
    viewAll: "전체 보기",
    columns: {
      customer: "고객",
      type: "유형",
      priority: "우선순위",
      received: "수신",
      status: "상태",
    },
    empty: "아직 요청이 없습니다.",
  },
  upcoming: {
    title: "예정 · 승인된 예약",
    empty: "승인·일정 확정된 예약이 없습니다.",
    confirmed: "확정",
    pending: "검토 중",
  },
  tools: {
    title: "작업 도구",
    subtitle: "Job Card, 통화 기록, 연동 상태",
  },
};

const dashboardPageKo = {
  title: "대시보드",
  subtitle: "야간·overflow 콜과 예약 요청을 한곳에서 확인합니다. 긴급은 문자로 먼저.",
  setupIncomplete:
    "연동 설정이 아직 완료되지 않았습니다. 전화 응대를 시작하려면 설정을 마치세요.",
  setupComplete: "라이브 상태 — Effiroad가 설정한 시간에 전화를 받고 있습니다.",
  stats: {
    tonightCalls: "오늘 밤 콜",
    bookings: "서비스 요청",
    pendingApproval: "승인 대기",
  },
  scheduleTitle: "AI 수신 시간대",
  scheduleEmpty: "등록된 시간대가 없습니다.",
  scheduleSetup: "연동 설정에서 시간대 설정하기",
  scheduleEdit: "연동 설정에서 수정",
  jobsTitle: "서비스 요청 · Job Card",
  jobsEmptyTitle: "아직 예약이 없습니다",
  jobsEmptyBody:
    "위에서 콜 메모를 붙여넣고 Job Card를 만든 뒤 「승인 대기로 저장」을 누르면 여기에 표시됩니다.",
  jobsEmptyHint: "야간 콜이 들어오면 문자로 알림이 오고, 여기에 요청이 쌓입니다.",
  jobStatus: {
    request_received: "요청 접수",
    pending_review: "검토 대기",
    approved: "승인됨",
    rejected: "거절됨",
    scheduled: "일정 확정",
    completed: "완료",
    confirmed: "승인됨",
    pending_approval: "검토 대기",
    sms_sent: "SMS 발송",
  },
  backOnboarding: "설정 마치기",
};

const dashboardUiKo = {
  hero: {
    loading: "불러오는 중…",
    ariaLabel: "이번 달 서비스 요청",
    serviceRequestsThisMonth: "이번 달 서비스 요청",
    sameAsLastMonth: "지난달과 동일",
    vsLastMonthUp: (n: number) => `지난달 동기간 대비 +${n}`,
    vsLastMonthDown: (n: number) => `지난달 동기간 대비 ${n}`,
    updating: "업데이트 중…",
    callsLine: (calls: number, conversion: number) =>
      calls > 0
        ? `콜 ${calls}건 · 전환율 ${conversion}%`
        : `콜 ${calls}건`,
    dailyRequests: "일별 요청",
    inboundCalls: "인바운드 콜",
    conversion: "전환율",
    emergenciesP1: "긴급(P1)",
    emptyConnected:
      "이번 달 서비스 요청이 아직 없습니다. 인바운드 콜과 Jobber 요청은 AI 접수 후 여기에 표시됩니다.",
    emptyNotConnected:
      "이번 달 요청이 아직 없습니다. Jobber를 연결하거나 전화 접수를 켜면 추적이 시작됩니다.",
  },
  recentBookings: {
    liveFeed: "실시간",
    title: "최근 예약",
    subtitle: "최신 서비스 요청 — 최신순",
    viewAll: "전체 보기",
    couldntLoad: "예약을 불러오지 못했습니다",
    emptyTitle: "아직 요청이 없습니다",
    emptyBody:
      "전화가 들어오거나 Jobber 요청이 생기면 AI 접수 후 여기에 표시됩니다. 아직 라이브가 아니라면 설정에서 착신 전환을 완료하세요.",
    emptyCta: "설정에서 라이브 시작",
  },
  smsFailureAlert: {
    title: "문자 전송 실패",
    fixSettings: "Twilio · 연락처 설정",
    dismiss: "닫기",
  },
  notifications: {
    activity: "활동",
    panelTitle: "알림 센터",
    panelSubtitle: "긴급·신규 예약부터 확인하세요",
    toReview: (n: number) => `확인 ${n}건`,
    allBookingsLink: "전체 예약",
    bellAria: (unread: number) =>
      unread > 0 ? `알림, 읽지 않음 ${unread}건` : "알림",
    upToDate: "확인 완료",
    unreadCount: (n: number) => `${n}건`,
    dropdownTitle: "알림",
    needAttention: (n: number) => `${n}건 확인 필요`,
    youreUpToDate: "확인할 알림이 없습니다",
    markAllRead: "모두 읽음",
    markAllReadShort: "전체 읽음",
    delete: "삭제",
    deleteAll: "전체 삭제",
    deleteSelected: "선택 삭제",
    deleteSelectedConfirm: (n: number) => `선택 삭제 (${n})`,
    cancelSelect: "취소",
    confirmDeleteAll: "모든 알림을 삭제할까요?",
    eventCount: (n: number) => `${n}건`,
    couldntLoad: "활동을 불러오지 못했습니다",
    allCaughtUp: "모두 확인했습니다",
    emptyAll: "새 예약, 콜, Jobber 이벤트가 여기 표시됩니다.",
    emptyFilter: "이 카테고리에는 지금 표시할 항목이 없습니다.",
    unreadAria: "읽지 않음",
    filters: {
      all: "전체",
      bookings: "예약",
      emergency: "긴급",
      callbacks: "콜백",
      jobber: "Jobber",
      voicemail: "음성메일",
    },
  },
  shopTools: {
    title: "샵 도구",
    subtitle: "연동, Job Card, 통화 기록",
  },
  customerVerificationKpi: {
    label: "고객 확인 완료율",
    shortHint: "고객 확인율",
    periodLabel: "재확인 문자 응답 기준",
  },
  kpiDrilldown: {
    eyebrow: "상세 명단",
    waitingPeriod: "현재 검토 대기",
    periodSum: (range: string) => `선택 기간 ${range}`,
    count: (n: number) => `${n}건`,
    empty: "해당 항목이 없습니다.",
    close: "닫기",
    viewAllBookings: "전체 예약 보기 →",
    tapHint: "클릭하여 명단 보기",
  },
  bookingDetail: {
    backToList: "← 예약 목록",
    pendingReviewTitle: "샵 검토가 필요합니다",
    pendingReviewBody:
      "확정 예약이 아니라 서비스 요청입니다. 내용을 확인한 뒤 승인 또는 거절해 주세요. 승인 전에는 고객에게 일정이 잡혔다고 안내하지 마세요.",
    approvedBanner: "승인됨",
    approvedBannerBody: "상태가 저장되었습니다. 아래에서 일정·완료만 변경할 수 있습니다.",
    rejectedBanner: "거절됨",
    rejectedBannerBody: "요청 DB에 저장되었습니다.",
    currentStatus: (label: string) => `현재 상태: ${label}`,
    decisionTitle: "요청 결정",
    decisionSubtitle: "요청 DB에 저장됩니다 (검토 대기 → 승인 또는 거절).",
    approve: "승인",
    reject: "거절",
    confirmApproveTitle: "승인하시겠습니까?",
    confirmApproveBody: "승인하면 고객 안내 문자가 발송될 수 있습니다.",
    confirmRejectTitle: "거절하시겠습니까?",
    confirmRejectBody: "거절하면 고객에게 거절 안내가 발송될 수 있습니다.",
    confirm: "확인",
    cancel: "취소",
    saving: "저장 중…",
    serviceRequest: "서비스 요청",
    callCustomer: "고객에게 전화",
    noPhone: "전화번호 없음",
    openJobber: "잡버에서 열기",
    jobberUnavailable: "잡버 링크 없음",
    markScheduled: "일정 확정으로 표시",
    markCompleted: "완료로 표시",
    customerInfo: "고객 정보",
    requestInfo: "요청 정보",
    name: "이름",
    phone: "전화번호",
    address: "주소",
    cityState: "도시 / 주",
    zip: "우편번호",
    issueType: "증상 유형",
    priority: "우선순위",
    changePriority: "우선순위 변경",
    requestDateTime: "요청 일시",
    status: "상태",
    customerPreference: "고객 희망",
    priorityReasonTitle: "우선순위 사유",
    priorityReasonAi: "전체 통화 전사 기준 AI 분류 (키워드 규칙 아님)",
    priorityReasonManual: "AI 분류 + 샵에서 수동 변경 — 위에서 우선순위를 바꿀 수 있습니다",
    callSummaryTitle: "통화 요약",
    callSummaryLinked: "AI 접수 — 요청 생성 전 확인된 항목",
    callSummaryUnlinked: "AI 접수 — 확정 예약이 아님",
    transcriptTitle: "통화 전사",
    transcriptSubtitle: "전체 대화 텍스트",
    transcriptEmpty: "이 요청에 대한 전사본이 없습니다.",
    recordingTitle: "통화 녹음",
    recordingSubtitle: "원본 통화 듣기",
    recordingEmpty: "녹음이 없습니다. Twilio 통화 녹음을 켜면 저장됩니다.",
    audioUnsupported: "브라우저에서 오디오를 재생할 수 없습니다.",
    trustScore: "신뢰 점수",
    trustScoreBenchmark: "80점 이상이면 충분",
    trustScoreSufficient:
      "80점 이상입니다. AI가 이름·주소·연락처 등 핵심 정보를 충분히 확인한 요청으로 보시면 됩니다. 그대로 검토·승인하셔도 괜찮습니다.",
    trustScoreHigh:
      "거의 모든 항목이 확인되었습니다. 바로 승인하셔도 됩니다.",
    trustScoreBelow:
      "80점 미만입니다. 승인 전에 이름·주소·전화번호만 한 번 직접 확인해 주세요.",
    trustCriteriaMet: (n: number, total: number) =>
      `연결된 통화 기준 ${total}개 항목 중 ${n}개 충족`,
    trustNoCall: "연결된 통화 없음 — 확인 데이터 부족으로 점수 산정",
    trustNoCallGuide:
      "통화가 연결되지 않아 점수를 매기기 어렵습니다. 고객 정보를 직접 확인한 뒤 처리해 주세요.",
    customerVerificationTitle: "고객 확인",
    customerVerificationNone:
      "고객 재확인 문자가 발송되지 않았습니다 (문자 링크 접수).",
    verificationTitle: "확인 상태",
    verificationLinked: "연결된 통화 — DTMF intake 및 AI 신뢰도",
    verificationUnlinked: "연결된 통화 없음 — 확인 데이터 없음",
    loadFailed: "요청을 불러오지 못했습니다",
    notFoundTitle: "요청을 찾을 수 없습니다",
    notFoundBody: "삭제되었거나 잘못된 링크일 수 있습니다.",
    viewAll: "전체 요청 보기",
    statusUpdateFailed: "상태를 저장하지 못했습니다.",
    statusNetworkError: "상태 저장 중 네트워크 오류가 발생했습니다.",
    priorityUpdateFailed: "우선순위를 저장하지 못했습니다.",
    priorityNetworkError: "우선순위 저장 중 네트워크 오류가 발생했습니다.",
  },
  loadErrors: {
    bothFailed: "예약을 불러올 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
    callsFailed: "통화 기록을 불러오지 못했습니다 — 저장된 예약만 표시합니다.",
    jobsFailed: "작업 기록을 불러오지 못했습니다 — 일부 예약이 누락될 수 있습니다.",
    network: "예약을 불러오는 중 네트워크 오류가 발생했습니다.",
    statusKv: "예약 상태 저장소를 사용할 수 없습니다. Vercel KV를 연결해 주세요.",
    statusFailed: "예약 상태를 불러오지 못했습니다.",
    jobberTimeout: "Jobber 동기화 시간 초과 — 콜과 저장된 작업만 표시합니다.",
    jobberFailed: "Jobber 동기화 실패 — 콜과 저장된 작업만 표시합니다.",
  },
  notificationEvents: {
    reviewRequest: "서비스 요청 검토",
    emergency: "긴급 콜 수신",
    callback: "고객 콜백 요청",
    voicemail: "새 음성메일",
    jobberFail: "Jobber 동기화 실패",
    jobberFailBodyRevenue:
      "수금(인보이스) 동기화 오류입니다. 통화와 작업 기록은 그대로입니다. 설정 → Jobber에서 연결을 확인해 주세요.",
    jobberFailBodyDisconnected: "Jobber가 연결되지 않았습니다. 설정에서 다시 연결해 주세요.",
    jobberFailBodyGeneric: "Jobber 동기화에 문제가 있습니다. 설정에서 연결 상태를 확인해 주세요.",
    p1Emergency: "P1 긴급",
    followUp: "후속 연락 요청",
    recordingReady: "녹음 준비됨",
    messageCaptured: "메시지 저장됨",
    approved: "요청 승인됨",
    rejected: "요청 거절됨",
    scheduled: "일정 확정 처리",
    completed: "완료 처리",
    requestReceived: "서비스 요청 접수",
    intakeFailed: "Intake 실패",
    smsFailed: "문자 전송 실패",
    caller: "발신자",
    inboundCall: "인바운드 콜",
  },
  missedCallsPrevented: {
    title: "지켜낸 고객",
    today: "오늘",
    last7: "최근 7일",
    last30: "최근 30일",
    allTime: "전체",
    helper:
      "야간·주말 또는 설정한 AI 수신 시간에 AI가 받은 콜 — 직원이 받기 어려웠을 가능성이 큰 통화입니다.",
    viewAnalytics: "분석 보기 →",
  },
  missedCallsAnalytics: {
    eyebrow: "가치 분석",
    title: "지켜낸 고객",
    subtitle:
      "부재중·야간·통화 불가 시간에 Effiroad가 대신 받아 지켜낸 고객입니다.",
    backToDashboard: "← 대시보드로",
    refresh: "새로고침",
    refreshing: "불러오는 중…",
    periodSum: "선택 기간 합계",
    periodPresets: [
      { id: "today" as const, label: "1일" },
      { id: "7d" as const, label: "7일" },
      { id: "30d" as const, label: "30일" },
      { id: "6m" as const, label: "6개월" },
      { id: "1y" as const, label: "1년" },
    ],
    chartTitle: "기간별 추세",
    chartSubtitle: "그래프 지표 칩과 동일 · 실제 통화·예약 기록 합계",
    chartEmpty: "이 기간에 방지된 콜이 없습니다.",
    loadingChart: "불러오는 중…",
    chartAria: "일별 놓친 콜 방지 추세",
    chartTooltip: (n: number) => `방지 ${n}건`,
    withoutEffiroad: "Effiroad 없었다면",
    estimatedMissed: "추정 놓친 콜",
    estimatedMissedBody:
      "야간·주말 또는 AI 수신 시간에 Effiroad가 받은 콜 — 음성사서함·누락됐을 가능성이 큰 건수입니다.",
    periodNote: (period: string) => `${period} 기준 · 새 통화 동기화 시 갱신`,
    howCalculated: "데이터 범위 및 집계 방식",
    howCalculatedBody:
      "모든 수치는 설정된 AI 응대 시간대 안에 Effiroad AI가 직접 받은 통화만 반영합니다. 응대 시간 외에 업체 번호로 걸려온 전화는 Effiroad를 경유하지 않으므로 이 통계에 포함되지 않습니다. AI가 받은 콜·살린 고객은 실제 인바운드 통화 기준, 확정 예약·검토 필요는 해당 기간에 접수된 요청 상태 기준입니다.",
    pageBadge: "분석",
  },
  ops: {
    today: "오늘",
    last7: "7일",
    last30: "30일",
    last90: "90일",
    last6m: "6개월",
    last1y: "1년",
    customRange: "기간 지정",
    justNow: "방금",
    totalBookings: "총 예약",
    emergencyCalls: "긴급 콜",
    conversionRate: "전환율",
    afterHours: "야간 처리",
    bookingTrend: "예약 추세",
    trendSubtitleJobber: "Jobber 작업 요청 + Effiroad 예약",
    trendSubtitle: "선택 기간 확정 예약",
    noBookingsInRange: "이 기간에 예약이 없습니다.",
    trendWeeklyHint: "월요일 기준 · 주간 합계 (막대)",
    trendMonthlyHint: "월별 합계 (막대)",
    trendTooltipBookings: (n: number) => `예약 ${n}건`,
    trendTooltipCalls: (n: number) => `콜 ${n}건`,
    hourly: "시간대별 분포",
    hourlySub: "인바운드 콜 (현지 시간)",
    dayOfWeek: "요일별 분석",
    dayOfWeekSub: "요일별 콜량",
    emergencyBreakdown: "긴급 등급",
    emergencySub: "콜·Job Card 기준 P1/P2/P3",
    zipAnalysis: "우편번호 분석",
    zipSub: "콜·작업 주소 기준 서비스 지역",
    activityFeed: "최근 활동",
    activitySub: "최신 콜·예약",
    insights: "운영 인사이트",
    insightsSub: "선택 기간 통계 vs 이전 기간",
    noActivity: "이 기간에 활동이 없습니다.",
    operationalInsights: "운영 인사이트",
  },
};

const messagingSetupKo = {
  eyebrow: "Auth · Email & SMS",
  title: "이메일 · 문자 인증",
  subtitle: "회원가입·비밀번호 찾기 인증번호 발송 설정",
  emailLabel: "이메일 (Resend)",
  emailFromLabel: "발신 주소",
  smsLabel: "문자 (Twilio)",
  smsFromLabel: "발신 번호",
  yes: "완료",
  no: "미설정",
  readyMessage: "인증번호가 실제 이메일/문자로 발송됩니다.",
  steps: [
    "Resend.com 가입 → API Key 발급 → Vercel에 RESEND_API_KEY 추가",
    "테스트: Resend 가입 이메일로만 수신 (도메인 인증 전)",
    "문자: TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER 추가",
    "Twilio Trial은 Verified 번호로만 SMS — Upgrade 후 고객 번호 가능",
    "환경 변수 저장 후 Vercel Redeploy → 회원가입 테스트",
  ],
};

const phoneSetupKo = {
  eyebrow: "Phone AI · v3",
  title: "야간 전화 수신",
  subtitle: "Twilio 번호로 걸려온 통화 → 음성 → Job Card (Jobber 연동 시 자동 전송)",
  twilioLabel: "Twilio 설정",
  numberLabel: "수신 번호",
  userLabel: "샵 계정 연결",
  webhookLabel: "웹훅 URL (공개 주소)",
  yes: "완료",
  no: "미설정",
  hint: "Twilio Trial은 한국 번호 Verified(SMS·전화)가 막힐 수 있습니다. 그때는 아래 「통화 시뮬레이션」으로 동일 흐름을 테스트하세요.",
  simulateCall: "통화 시뮬레이션 (한국 Trial용)",
  simulateCallOk: "시뮬레이션 완료. 인바운드 통화를 확인하세요.",
  krTrialNote:
    "한국 번호(010…)로 오는 업주·고객 문자: Twilio Trial이면 콘솔에서 해당 번호를 Verified caller IDs에 등록해야 합니다. 실전화도 Verified 번호로만 발신 가능합니다.",
  costNote:
    "비용: Effiroad는 자동 결제 없음. Twilio는 실제 전화·월 번호요금, OpenAI는 Job Card 생성 시 API 사용료만 (시뮬레이션도 OpenAI 소액). Trial 크레딧 소진 전까지 청구 없을 수 있음.",
  ivrNote:
    "실전화: 1=긴급, 2=당일, 3=일반 → 이후 천천히 이름·주소·증상 말하기 (발음 힌트·재시도 적용).",
  stepsTitle: "연결 체크리스트",
  steps: [
    "Twilio 콘솔에서 Account SID · Auth Token · 미국 번호(+1) 복사",
    ".env.local에 TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER 붙여넣기",
    "터미널: npm run tunnel → 나온 https 주소를 TWILIO_WEBHOOK_BASE_URL에 저장",
    "npm run dev 재시작 → 아래 「웹훅 자동 등록」 클릭 (또는 Twilio 콘솔에 Voice URL 수동 입력)",
    "Twilio 번호로 전화해 보기 (Trial은 Verified Caller ID에 등록한 번호만)",
  ],
  configureWebhook: "웹훅 자동 등록",
  configureWebhookOk: "Twilio Voice 웹훅이 등록되었습니다.",
  configureWebhookFail: "웹훅 등록에 실패했습니다.",
  voiceWebhookPath: "/api/twilio/voice",
  restartHint: "환경 변수 수정 후에는 dev 서버를 껐다 켜야 반영됩니다.",
};

const inboundCallsKo = {
  title: "인바운드 통화",
  subtitle: "Twilio로 들어온 통화에서 만든 Job Card",
  loading: "불러오는 중…",
  empty: "아직 통화 기록이 없습니다. Twilio 테스트 통화 후 여기에 표시됩니다.",
  unknownCustomer: "고객명 미상",
};

const jobberConnectKo = {
  eyebrow: "Jobber · v2",
  title: "Jobber 연동",
  subtitle: "연결하면 Job Card를 Jobber Request로 보낼 수 있습니다.",
  connectedSubtitle: "연결됨: {account}",
  badgeConnected: "연결됨",
  badgeDisconnected: "미연결",
  connect: "Jobber 연결",
  disconnect: "연결 해제",
  disconnecting: "해제 중…",
  notConfigured:
    "개발자용: .env.local에 JOBBER_CLIENT_ID / SECRET을 넣으세요. (JOBBER_SETUP.md)",
  redirectSetupTitle: "Jobber Developer Center 설정 필요",
  redirectSetupBody:
    "아래 Callback URL을 Jobber 앱 설정에 그대로 추가한 뒤 저장하세요. (OAuth Callback URL)",
  redirectSetupLink: "Jobber Developer Center 열기",
  redirectSetupCopied: "복사됨",
  redirectSetupCopy: "URL 복사",
  redirectSetupNote:
    "Callback URL은 공백 없이 정확히 일치해야 합니다. Jobber는 보통 Callback URL 칸이 하나뿐이라, 라이브 연결 시 localhost를 프로덕션 URL로 바꿔 저장하세요. Vercel Client ID와 같은 앱을 여세요.",
  redirectSetupClientId:
    "Effiroad가 사용 중인 Jobber Client ID: {clientId} — Developer Center에서 이 ID가 보이는 앱에 Callback URL을 추가하세요.",
  redirectAlsoRegister: "Callback을 여러 개 넣을 수 있으면 아래도 같은 Client ID 앱에 추가하세요:",
  redirectConfirmCheckbox:
    "Jobber Developer Center에서 같은 Client ID 앱에 https://effiroad.com/api/jobber/callback 을 저장했습니다.",
  redirectConfirmHint: "Connect이 실패할 때만 필요합니다. 위 Callback URL을 저장한 뒤 다시 Connect 하세요.",
  oauthErrorRedirectLocalhost:
    "프로덕션에서는 localhost 콜백을 쓸 수 없습니다. Vercel에 JOBBER_REDIRECT_URI=https://effiroad.com/api/jobber/callback 을 넣고, Jobber Developer Center에도 같은 URL을 등록하세요.",
  oauthErrorRedirectMissing:
    "OAuth 콜백 URL이 없습니다. JOBBER_REDIRECT_URI 또는 NEXT_PUBLIC_APP_URL을 설정한 뒤 재배포하세요.",
  oauthErrorNotConfigured:
    "Jobber가 아직 설정되지 않았습니다. Vercel에 JOBBER_CLIENT_ID / SECRET을 추가하세요.",
  oauthErrorGeneric:
    "Jobber 연결에 실패했습니다. 아래 Callback URL이 같은 Client ID 앱에 저장됐는지 확인한 뒤 다시 연결하세요.",
  settingsConnectedHint: "승인·확정된 예약이 Jobber 일정에 자동 반영됩니다.",
  invoiceAccessOk: "수금 매출: Jobber 인보이스 읽기 권한 정상.",
  invoiceAccessReconnect:
    "수금 매출용 권한 갱신이 필요합니다. 연결 해제 후 다시 연결하세요.",
  invoiceAccessError: "인보이스 권한 확인 실패. Jobber 재연결을 시도하세요.",
  settingsDisconnectedHint: "연결 → Jobber 로그인 → Allow Access. 끝.",
  push: "Jobber로 보내기",
  pushing: "Jobber 전송 중…",
  pushed: "Jobber에 생성됨",
  pushError: "Jobber 전송에 실패했습니다.",
  openJobber: "Jobber에서 열기",
};

const jobCardGeneratorKo = {
  eyebrow: "v1 · 지금 사용 가능",
  title: "콜 메모 → Job Card",
  subtitle:
    "야간·주말 통화 내용을 붙여넣으면 긴급도(긴급·당일·일반)와 Jobber용 메모 초안을 만듭니다. 확인 후 붙여넣기.",
  badge: "스마트 자동 예약",
  notesLabel: "콜 메모 / 통화 요약",
  notesPlaceholder:
    "예: No AC, 123 Oak St Austin TX, 이름 Mike, 실내 85°F, 냉매 소리 이상, 오늘 밤 방문 희망…",
  generate: "Job Card 생성",
  generating: "생성 중…",
  errorGeneric: "Job Card를 생성하지 못했습니다.",
  resultLabel: "AI 초안 — Jobber에 넣기 전 확인",
  fields: {
    customer: "고객",
    phone: "전화",
    address: "주소",
    window: "방문 시간대",
    dispatch: "Dispatch 메모",
    jobber: "Jobber 붙여넣기용",
  },
  copy: "Jobber 메모 복사",
  copied: "복사됨",
  save: "승인 대기로 저장",
  pushJobber: "Jobber로 보내기",
  pushingJobber: "Jobber 전송 중…",
  pushedJobber: "Jobber 전송 완료",
  pushJobberFailed: "Jobber 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

const authPagesKo = {
  form: {
    passwordConfirmLabel: "비밀번호 확인",
    passwordMismatch: "비밀번호 확인이 일치하지 않습니다.",
    loading: "처리 중…",
    errorGeneric: "요청에 실패했습니다.",
    errorNetwork: "네트워크 오류. 잠시 후 다시 시도해 주세요.",
    backHome: "← 홈으로",
  },
  login: {
    title: "로그인",
    subtitle: "Effiroad 대시보드에 접속합니다.",
    methodLegend: "로그인 방법",
    methodEmail: "이메일",
    methodPhone: "전화번호",
    emailLabel: "이메일",
    phoneLabel: "휴대폰 번호",
    phonePlaceholder: "(512) 555-0100",
    passwordLabel: "비밀번호",
    submit: "로그인",
    noAccount: "계정이 없으신가요?",
    signupLink: "회원가입",
    forgotLink: "비밀번호를 잊으셨나요?",
    rememberMeLabel: "이 기기에서 로그인 유지",
  },
  forgotPassword: {
    title: "비밀번호 재설정",
    subtitleRequest: "가입한 이메일로 인증번호를 받아 새 비밀번호를 설정합니다.",
    subtitleRequestSms: "가입한 휴대폰 번호로 인증번호를 받아 새 비밀번호를 설정합니다.",
    subtitleVerify: "이메일 또는 문자로 받은 6자리 인증번호를 입력하세요.",
    subtitleReset: "새 비밀번호를 입력해 주세요.",
    subtitleDone: "비밀번호가 변경되었습니다.",
    emailLabel: "이메일",
    phoneLabel: "휴대폰 번호",
    phonePlaceholder: "(512) 555-0100",
    channelLabel: "인증번호 받기",
    channelEmail: "이메일로 받기",
    channelSms: "문자(SMS)로 받기",
    channelHint: "문자는 회원가입 시 등록한 휴대폰 번호로만 발송됩니다.",
    devEmailHint:
      "로컬 개발 중에는 이메일이 실제로 오지 않을 수 있습니다. Resend(API 키) 설정 전에는 터미널 로그를 확인하세요.",
    sendCode: "인증번호 보내기",
    codeLabel: "인증번호 (6자리)",
    codeHint: "10분 내에 입력해 주세요. 타인에게 공유하지 마세요.",
    verifyCode: "인증 확인",
    resendSms: "문자로 다시 받기",
    resendSmsSuccess: "등록된 휴대폰으로 인증번호를 보냈습니다.",
    backToEmail: "← 이메일 다시 입력",
    newPasswordLabel: "새 비밀번호",
    confirmPasswordLabel: "새 비밀번호 확인",
    resetPassword: "비밀번호 변경",
    goLogin: "로그인하기",
    backLogin: "로그인으로 돌아가기",
    sentMessage: "등록된 계정이면 인증번호를 보냈습니다.",
    sentMessageEmail: "등록된 이메일로 인증번호를 보냈습니다.",
    sentMessageSms: "등록된 휴대폰 번호로 인증번호를 보냈습니다.",
    doneMessage: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
    loading: "처리 중…",
    errorGeneric: "요청에 실패했습니다.",
    errorNetwork: "네트워크 오류. 잠시 후 다시 시도해 주세요.",
  },
  signup: {
    title: "회원가입",
    step1Label: "1. 정보 입력",
    step2Label: "2. 인증번호",
    subtitle: "정보 입력 후 「인증번호 보내기」를 눌러 본인 확인을 시작하세요.",
    subtitleVerify: "인증번호 확인 후 「계정 만들기」를 눌러 가입을 완료하세요.",
    shopLabel: "업체 이름",
    shopPlaceholder: "예: Cool Air HVAC",
    emailLabel: "이메일",
    passwordLabel: "비밀번호",
    passwordHint: "8자 이상 · 대소문자 · 숫자 · 특수문자 포함",
    phoneLabel: "휴대폰 번호",
    phoneLabelRequired: "휴대폰 번호 (필수)",
    phonePlaceholder: "(512) 555-0100",
    phoneHintRequired:
      "미국 휴대폰(+1) — 새 요청 알림·Reply 1/2 답장에 사용됩니다. 예: (512) 555-0100",
    phoneHintSms: "문자 인증번호를 이 번호로 보냅니다.",
    phoneRequired: "휴대폰 번호를 입력해 주세요.",
    phoneRequiredSms: "문자(SMS) 인증을 선택했으면 휴대폰 번호를 입력해 주세요.",
    verifyChannelLabel: "인증번호 받기",
    verifyChannelEmail: "이메일로 받기 (추천)",
    verifyChannelSms: "문자(SMS)로 받기",
    verifyChannelHint: "인증번호는 이메일 또는 문자로 받습니다. 휴대폰 번호는 위에서 이미 필수로 입력합니다.",
    sendCode: "인증번호 보내기",
    sendCodeNote: "인증번호를 받은 뒤 6자리를 입력하고 「인증 확인」을 누르세요.",
    sendCodeCooldown: "다시 보내기 ({seconds}초)",
    sentCodeMessage: "인증번호를 보냈습니다. 이메일 또는 문자함을 확인해 주세요.",
    codeLabel: "인증번호 (6자리)",
    codeHint: "10분 내에 입력해 주세요. 타인에게 공유하지 마세요.",
    verifyCode: "인증 확인",
    verifiedMessage: "인증이 완료되었습니다. 아래 「계정 만들기」를 눌러 가입을 마무리하세요.",
    completeSignup: "계정 만들기",
    backToDetails: "← 정보 다시 입력",
    hasAccount: "이미 계정이 있으신가요?",
    loginLink: "로그인",
    consentTermsLabel: "이용약관 및 개인정보처리방침에 동의합니다 (필수).",
    consentSmsLabel:
      "등록한 휴대폰으로 서비스 관련 문자(인증번호, 신규 요청 알림, Reply 1/2) 수신에 동의합니다. 요금이 부과될 수 있으며 STOP으로 수신 거부할 수 있습니다 (필수).",
    consentMarketingEmailLabel: "선택 — Effiroad 제품 팁·업데이트를 이메일로 받기.",
    consentMarketingSmsLabel:
      "선택 — Effiroad 제품 팁·업데이트를 문자로 받기. 요금이 부과될 수 있으며 STOP으로 수신 거부할 수 있습니다.",
    consentRequired: "아래 세 가지 필수 항목에 모두 동의해야 계속할 수 있습니다.",
    consentLegalLegend: "약관 동의",
    consentTermsLink: "이용약관",
    consentPrivacyLink: "개인정보처리방침",
  },
};

const legalPagesKo = {
  privacy: {
    title: "개인정보처리방침",
    updated: "2026년 3월",
    sections: [
      {
        heading: "수집 항목",
        body: "이메일, shop 이름, 결제 정보(Lemon Squeezy), Jobber 연동 시 고객·예약 메타데이터, 통화 로그(연동 시).",
      },
      {
        heading: "이용 목적",
        body: "서비스 제공, 결제·온보딩, 야간 콜 처리, Jobber 예약 생성, 고객·기사 SMS 발송.",
      },
      {
        heading: "보관·삭제",
        body: "계정 해지 요청 시 관련 데이터를 삭제합니다. 법적 보관 의무가 있는 결제 기록은 해당 기간 동안 보관할 수 있습니다.",
      },
      {
        heading: "SMS·TCPA",
        body: "서비스 문자에는 STOP 수신 거부 안내가 포함됩니다. 가입·고객 인테이크 시 동의 시각을 기록합니다. 메시지·데이터 요금이 부과될 수 있습니다.",
      },
      {
        heading: "문의",
        body: `개인정보 관련 문의: ${SITE.supportEmail}`,
      },
    ],
  },
  terms: {
    title: "이용약관",
    updated: "2026년 7월",
    sections: [
      {
        heading: "서비스",
        body: "Effiroad는 독립 복구·HVAC 업체를 위한 야간·오버플로우 전화 인테이크, 업주 승인, 크루 알림 소프트웨어입니다. 긴급 출동업체·보험사·사람이 반드시 받는다고 보장하는 콜센터가 아닙니다.",
      },
      {
        heading: "보장 없음 (AS IS)",
        body: '서비스는 "있는 그대로(AS IS)" 제공됩니다. 전화가 반드시 연결·녹음·분류·디스패치된다고 보장하지 않습니다. 통신사·착신전환 설정 오류·AI 오인식·장애가 발생할 수 있습니다. 테스트 통화로 착신전환을 확인하고 실제 트래픽을 모니터링해야 합니다.',
      },
      {
        heading: "업체(고객) 책임",
        body: "출동·일정·가격·안전·고객 응대의 최종 결정과 책임은 shop 오너에게 있습니다. Effiroad는 인테이크와 알림 도구일 뿐입니다.",
      },
      {
        heading: "제3자 서비스",
        body: "Twilio, Retell, 통신사, SMS 게이트웨이 등 제3자 장애 또는 shop 측 설정 오류로 인한 문제에 대해 Effiroad는 책임지지 않습니다.",
      },
      {
        heading: "무료 파일럿",
        body: "무료 평가 기간은 최선 노력(best-effort)이며 SLA가 없습니다. 언제든 중단할 수 있습니다.",
      },
      {
        heading: "책임 한도",
        body: "법이 허용하는 최대 범위에서, Effiroad의 총 배상 책임은 해당 클레임 발생 전 12개월간 지불한 요금(무료 체험만 사용한 경우 USD $100)을 초과하지 않습니다. 영업 손실·놓친 통화·간접 손해에 대해서는 책임지지 않습니다.",
      },
      {
        heading: "면책(Indemnification)",
        body: "shop은 서비스 사용, 출동 결정, 고객 분쟁으로 인해 Effiroad에 제기되는 청구로부터 Effiroad를 면책하고 보호하는 데 동의합니다.",
      },
      {
        heading: "요금·환불",
        body: "구독 요금은 결제 시 안내된 플랜에 따릅니다. 환불은 환불 정책 페이지를 참고하세요.",
      },
      {
        heading: "SMS·메시징",
        body: "고객 문자 동의·A2P/10DLC 준수는 shop의 책임입니다. Effiroad는 인테이크 동의 체크박스와 STOP 처리를 제공합니다.",
      },
      {
        heading: "문의",
        body: `약관 문의: ${SITE.supportEmail}`,
      },
    ],
  },
  refund: {
    title: "환불 정책",
    updated: "2026년 7월",
    sections: [
      {
        heading: "30일 환불 보장",
        body: "모든 Effiroad 구독은 30일 환불 보장을 포함합니다. 첫 유료 구독 후 30일 이내에 만족하지 못하시면 이메일 주시면 최근 결제 금액을 전액 환불해 드립니다.",
      },
      {
        heading: "환불 요청 방법",
        body: `계정에 등록된 이메일 주소로 ${SITE.supportEmail}에 상호명과 함께 문의해 주세요. 결제 대행사이자 판매자(Merchant of Record)인 Lemon Squeezy를 통해 원 결제 수단으로 보통 영업일 기준 5~10일 내 처리됩니다.`,
      },
      {
        heading: "해지",
        body: "언제든 해지할 수 있으며 약정·해지 수수료가 없습니다. 해지 시 향후 갱신이 중단되고, 현재 결제 주기 종료 시까지는 서비스가 유지됩니다. 현재 주기에 이미 청구된 금액은 위 30일 보장 외에는 환불되지 않습니다.",
      },
      {
        heading: "Flex 요금제(건당 요금)",
        body: "Flex 요금제의 승인 예약 건당 요금은 이미 제공된 서비스에 대한 것으로 환불되지 않습니다. 단, 오류로 청구된 경우 즉시 바로잡아 드립니다.",
      },
      {
        heading: "문의",
        body: `환불·결제 문의: ${SITE.supportEmail}`,
      },
    ],
  },
};

export function getVowDashboardCopy(locale: UiLocale): typeof vowDashboardEn {
  return pickLocaleCopy(locale, vowDashboardKo, vowDashboardEn);
}

export function getDashboardPageCopy(locale: UiLocale): typeof dashboardPageEn {
  return pickLocaleCopy(locale, dashboardPageKo, dashboardPageEn);
}

export function getDashboardUiCopy(locale: UiLocale): ReturnType<typeof buildDashboardUiEn<typeof dashboardUiKo>> {
  const en = buildDashboardUiEn(dashboardUiKo);
  if (locale === "ko") {
    return pickLocaleCopy(locale, dashboardUiKo, en);
  }
  return en;
}

export function getSettingsPageCopy(locale: UiLocale): typeof settingsPageEn & typeof settingsPageKo {
  return pickLocaleCopy(locale, settingsPageKo, settingsPageEn);
}

/** @deprecated Prefer get*Copy(locale) or useSettingsPage() */
export const settingsPage = new Proxy({ ...settingsPageKo, ...settingsPageEn }, {
  get(_target, prop, receiver) {
    return Reflect.get(getSettingsPageCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof settingsPageEn & typeof settingsPageKo;
/** @deprecated Prefer getVowDashboardCopy(locale) or useVowDashboard() */
export const vowDashboard = new Proxy(vowDashboardEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getVowDashboardCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof vowDashboardEn;
/** @deprecated Prefer getDashboardPageCopy(locale) or useDashboardPage() */
export const dashboardPage = new Proxy(dashboardPageEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getDashboardPageCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof dashboardPageEn;
/** @deprecated Prefer getDashboardUiCopy(locale) or useDashboardUi() */
export const dashboardUi = new Proxy(buildDashboardUiEn(dashboardUiKo), {
  get(_target, prop, receiver) {
    return Reflect.get(getDashboardUiCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as ReturnType<typeof buildDashboardUiEn<typeof dashboardUiKo>>;
export function getAuthPagesCopy(_locale: UiLocale) {
  // US product — signup/login stay English for American shop owners.
  return authPagesEn;
}
export function getLegalPagesCopy(_locale: UiLocale) {
  // US product — legal pages stay English.
  return legalPagesEn;
}
export function getMessagingSetupCopy(_locale: UiLocale) {
  return messagingSetupEn;
}
export function getPhoneSetupCopy(_locale: UiLocale) {
  return phoneSetupEn;
}
export function getInboundCallsCopy(_locale: UiLocale) {
  return inboundCallsEn;
}
export function getJobberConnectCopy(_locale: UiLocale) {
  return jobberConnectEn;
}
export function getJobCardGeneratorCopy(_locale: UiLocale) {
  return jobCardGeneratorEn;
}

/** @deprecated Prefer getAuthPagesCopy(locale) */
export const authPages = new Proxy(authPagesEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuthPagesCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof authPagesEn;
/** @deprecated Prefer getLegalPagesCopy(locale) */
export const legalPages = new Proxy(legalPagesEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getLegalPagesCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof legalPagesEn;
/** @deprecated Prefer getMessagingSetupCopy(locale) */
export const messagingSetup = new Proxy(messagingSetupEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getMessagingSetupCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof messagingSetupEn;
/** @deprecated Prefer getPhoneSetupCopy(locale) */
export const phoneSetup = new Proxy(phoneSetupEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getPhoneSetupCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof phoneSetupEn;
/** @deprecated Prefer getInboundCallsCopy(locale) */
export const inboundCalls = new Proxy(inboundCallsEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getInboundCallsCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof inboundCallsEn;
/** @deprecated Prefer getJobberConnectCopy(locale) */
export const jobberConnect = new Proxy(jobberConnectEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getJobberConnectCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof jobberConnectEn;
/** @deprecated Prefer getJobCardGeneratorCopy(locale) */
export const jobCardGenerator = new Proxy(jobCardGeneratorEn, {
  get(_target, prop, receiver) {
    return Reflect.get(getJobCardGeneratorCopy(runtimeUiLocale()) as object, prop, receiver);
  },
}) as typeof jobCardGeneratorEn;
