import { SITE, CHECKOUT_CTA } from "./constants";
import { IS_BETA } from "./beta";

export const hero = IS_BETA
  ? {
      badge: "퍼블릭 베타 · 미국 residential HVAC · 문자 승인",
      headline: "바쁜 날, 야간, 현장에서도",
      headlineAccent: "문자로 예약 확인",
      subhead:
        "고객 번호는 그대로. 못 받을 때·야간에만 Vowpath로 착신전환하면 AI가 전화·링크 접수를 받습니다. 접수 내용은 문자·이메일로 오고, 1=승인·2=거절만 답하면 됩니다.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "작동 방식 보기",
      note: "무료 베타 · Jobber 연동은 선택",
    }
  : {
      badge: "미국 residential HVAC · 문자로 예약 승인",
      headline: "밖에서 일할 때도",
      headlineAccent: "놓치지 않는 예약",
      subhead:
        "메인 번호는 유지하고, 안 받으면·야간·주말에만 Vowpath로 넘깁니다. AI가 접수하면 문자·이메일로 요약이 오고, 1=승인·2=거절만 하면 고객 안내와 Jobber 기록이 이어집니다.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "제품 보기",
      note: `맞춤 시간대 · 정액 ${SITE.monthlyPrice}/월 또는 성과형 ${SITE.flexBasePrice}/월 + 승인 예약당 ${SITE.flexPerBooking}`,
    };

export const signupFlow = {
  title: "결제 후 10분 안에 연동",
  subtitle: "상담 없음. 결제 → 시간대 → 포워딩 → 문자 알림 시작 (Jobber는 선택).",
  steps: [
    {
      step: "01",
      title: "Stripe 결제",
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
        "안 받으면·통화중·야간에 메인 번호 → Vowpath로 착신전환. 고객 번호는 바꾸지 않습니다.",
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
  title: "Vowpath가 하는 일",
  subtitle:
    "메인 번호는 그대로 두고, 못 받을 때만 Vowpath로 넘깁니다. 접수는 문자·이메일로, 1·2로 승인하면 고객 안내와 Jobber까지 이어집니다.",
  items: [
    {
      title: "메인 번호 그대로",
      description:
        "고객에게 보이는 번호는 지금 쓰는 업체 번호 하나. 홈페이지·구글 번호를 바꿀 필요 없습니다.",
    },
    {
      title: "조건부 착신전환",
      description:
        "안 받으면 / 통화중 / 몇 초 후 Vowpath로 전환. 야간·주말은 통신사 스케줄 또는 VoIP 시간 규칙으로 설정합니다.",
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
    { value: "27%+", label: "업계 평균 부재중·놓친 인바운드 콜" },
    { value: "$300+", label: "놓친 서비스 콜 1통당 예상 매출 손실" },
    { value: "80%+", label: "음성사서함 → 경쟁업체로 바로 전환" },
  ],
  callout: "긴급 job 1건만 살려도 월 구독료는 충분히 회수됩니다.",
};

export const howItWorks = {
  title: "작동 방식",
  subtitle: "메인 번호는 그대로 — 못 받을 때만 Vowpath로 넘기면 접수·승인·Jobber까지 이어집니다.",
  steps: [
    {
      step: "01",
      title: "착신전환 설정",
      description:
        "업체 번호는 그대로 둡니다. 안 받으면·통화중·야간·주말에 Vowpath로 착신전환합니다. 대시보드에서 AI 받을 시간도 함께 정합니다.",
    },
    {
      step: "02",
      title: "전화 or 링크 접수",
      description:
        "AI가 전화 접수와 링크 접수 중 선택을 안내합니다. 고객이 남긴 연락처·주소·증상을 요약해 둡니다.",
    },
    {
      step: "03",
      title: "문자·이메일 승인",
      description:
        "접수 내용이 업체 휴대폰 문자와 이메일로 옵니다. 1=승인, 2=거절. 승인 시 고객에게 확정 문자가 가고 Jobber에 자동 기록됩니다.",
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
        "안 받으면 / 통화중 / 몇 초 후 Vowpath로 전환. 고객에게 보이는 번호는 업체 메인 번호 그대로입니다.",
    },
    {
      title: "전화 · 링크 접수",
      description: "통화 중 전화로 말하거나, 링크 폼으로 접수. 둘 다 같은 흐름으로 이어집니다.",
    },
    {
      title: "SMS · 이메일 알림",
      description: "접수 요약이 휴대폰 문자로 옵니다. 같은 내용이 이메일로도 와서 한 번 더 확인할 수 있습니다.",
    },
    {
      title: "1 / 2 승인",
      description: "1=승인, 2=거절만 답하면 됩니다. 승인하면 고객에게 바로 확정 문자가 갑니다.",
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
  subtitle: "피크에 콜이 많으면 정액, 가끔이면 성과형. 문자 승인·Job Card 포함, Jobber는 선택.",
  compare: [
    { label: "맞춤 수신 시간대", amount: "무제한 구간" },
    { label: "문자 승인 + Job Card", amount: "포함" },
    {
      label: "긴급(P1) 당직 SMS",
      amount: "포함",
      highlight: true,
    },
  ],
  plans: [
    {
      id: "unlimited" as const,
      name: "정액 Unlimited",
      badge: "가장 많이 선택",
      description: "설정한 시간대 콜·예약 무제한. 피크 시즌에 유리.",
      price: SITE.monthlyPrice,
      period: "/월",
      usageLine: "추가 건당 수수료 없음",
      features: [
        "요일·시간대 무제한 스케줄",
        "설정 시간 내 AI 콜 무제한",
        "문자 1/2 승인 · Job Card",
        "긴급(P1) 즉시 SMS · Jobber 선택",
        "월 요금만 — 예약 많아도 동일",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — 정액`,
    },
    {
      id: "flex" as const,
      name: "성과형 Flex",
      badge: "쓴 만큼만",
      description: "야간 콜이 적은 shop. 승인한 예약만 추가 과금.",
      price: SITE.flexBasePrice,
      period: "/월",
      usageLine: `+ 승인 예약 1건당 ${SITE.flexPerBooking}`,
      features: [
        "정액과 동일한 AI · 문자 승인 · Job Card",
        "맞춤 수신 시간대",
        "예약 승인 모드",
        "월 기본료 + 확정 예약당 수수료",
        "콜만 받고 예약 0건 → 기본료만",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — 성과형`,
    },
  ],
  tip: `월 승인 예약 약 9건 이상이면 정액(${SITE.monthlyPrice})이 보통 더 쌉니다.`,
  footnote:
    "성과형: 기본료는 매월, 수수료는 업체가 문자·대시보드로 승인한 예약만 (스팸·취소 제외).",
};

export const faq = {
  title: "자주 묻는 질문",
  items: [
    {
      q: "번호 두 개 써야 하나요?",
      a: "아니요. 고객에게는 지금 쓰는 메인 번호 하나만 보입니다. 통신사·VoIP에서 안 받으면·통화중이면·야간·주말에만 Vowpath 번호로 착신전환합니다. Vowpath 번호는 설정용이지, 사이트에 새로 올리는 번호가 아닙니다.",
    },
    {
      q: "낮 시간은 AI가 안 받나요?",
      a: "낮 9–5는 업체가 직접 받고, 저녁·주말·못 받을 때만 Vowpath로 넘깁니다. 착신전환을 ‘안 받을 때만’으로 두면 낮에는 평소처럼 연결됩니다.",
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
      q: "예약 승인 모드가 뭔가요?",
      a: "AI가 접수만 하고, 오너가 문자 1=확정·2=거절로 결정합니다. 확정 후 고객에게 안내 문자가 갑니다.",
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

export const cta = {
  title: "바쁠 때도, 문자 한 통으로",
  subtitle: "시간대 정하고 · 포워딩하고 · 야간 콜은 휴대폰으로.",
  button: CHECKOUT_CTA,
};

export const getStartedPage = {
  eyebrow: "결제",
  title: "플랜 선택",
  subtitle: `Stripe 안전 결제 · 정액 ${SITE.monthlyPrice}/월 또는 성과형 ${SITE.flexBasePrice}/월 + 예약당 ${SITE.flexPerBooking}`,
  canceledMessage: "결제가 취소되었습니다. 아래에서 플랜을 다시 선택해 주세요.",
  checkoutError:
    "결제를 시작하지 못했습니다. 아래 버튼으로 다시 시도하거나 회원가입으로 진행해 주세요.",
  demoNotice:
    "결제 연동 전입니다. 플랜을 고른 뒤 회원가입하면 연동 설정으로 이어집니다.",
  afterPay: "결제 완료 후 → 연동 설정(시간대 · 포워딩) 약 10분 · Jobber 선택",
};

export const onboardingPage = {
  title: "연동 설정",
  subtitle: "결제 완료. 시간대와 포워딩만 하면 문자 알림이 시작됩니다.",
  paidBadge: "결제 완료",
  onboardingBadge: "설정 중",
  stepLockedLabel: "이전 단계 완료 후",
  scheduleHint: "예: 월–금 17:00–08:00, 토–일 종일",
  jobberHint: "Jobber 계정을 OAuth로 연결합니다. 테스트 Jobber 샵으로 로그인하세요.",
  backHome: "← 홈으로",
  steps: [
    {
      id: "schedule",
      title: "AI 수신 시간대 설정",
      description:
        "예: 월–금 17:00–08:00, 토–일 종일. 여러 구간 추가 가능.",
      action: "시간대 설정하기",
      status: "ready" as const,
    },
    {
      id: "phone",
      title: "Call forwarding",
      description:
        "Copy your Vowpath number into Dialpad or your phone system. Follow the guide and test.",
      action: "Next step",
      status: "ready" as const,
    },
    {
      id: "jobber",
      title: "Jobber (선택)",
      description: "이미 Jobber 쓰는 샵만 OAuth 연결. 안 해도 문자·대시보드로 운영 가능.",
      action: "건너뛰기 또는 연결",
      status: "ready" as const,
    },
  ],
  liveBanner: "시간대 + 포워딩 완료 시 AI 수신·문자 알림 시작 (Jobber 선택)",
  forwardingNext: "Next: Jobber (optional)",
  jobberSkip: "Jobber 없이 계속",
  support: `문의: ${SITE.supportEmail}`,
  completeAction: "대시보드로 이동",
};

export const settingsPage = {
  title: "연동 설정",
  subtitle: "AI 수신 시간대·포워딩(필수)과 Jobber(선택)를 관리합니다.",
  badge: "연동 설정",
  paidBadge: "결제 완료",
  paidWelcome:
    "결제가 완료되었습니다. 필수 3가지(연락처·시간대·포워딩)를 설정하면 문자 알림이 시작됩니다.",
  progressTitle: "필수 {done}/{total} 완료",
  progressSummary: "필수 {done}/{total} 완료",
  progressHint:
    "먼저 미국 휴대폰·이메일을 저장한 뒤, 시간대와 포워딩을 설정하세요. Jobber는 선택입니다.",
  scrollHint: "연락처 → 시간대 → 포워딩 → Jobber(선택) 순서입니다.",
  tocLabel: "바로 가기",
  tocContact: "① 연락처",
  tocSchedule: "② 시간대",
  tocPhone: "③ Forwarding",
  tocJobber: "④ Jobber",
  contactTitle: "업체 연락처 (필수)",
  contactDescription:
    "신규 요청·1/2 승인 알림을 받을 미국 휴대폰과 이메일입니다. 문자가 메인, 이메일은 백업입니다.",
  contactIntro:
    "미국 HVAC shop 기준입니다. 휴대폰은 +1 미국 번호, 이메일은 업체 대표 메일을 입력하세요.",
  contactIntroKr:
    "로컬 개발: 한국 010 또는 미국 +1. 배포 시 미국 업체만 +1.",
  contactEmailLabel: "이메일",
  contactEmailHint: "예약 알림 백업·로그인에 사용됩니다.",
  contactPhoneLabel: "휴대폰 번호 (미국)",
  contactPhoneLabelKr: "휴대폰 번호 (한국 테스트)",
  contactPhoneHint:
    "SMS로 신규 요청·Reply 1=확정·2=거절. 예: (512) 555-0100 또는 +1 512-555-0100",
  contactPhoneHintKr:
    "로컬만: 010 형식. Twilio 업그레이드 후 실문자. 미국 배포는 +1만.",
  contactKrTestBanner:
    "한국 번호 테스트 모드입니다. 실제 문자는 Twilio 업그레이드 후 SMS_DEV_PREVIEW를 끄세요.",
  contactConfirm: "연락처 저장",
  contactSaving: "저장 중…",
  contactConfirmed: "연락처가 저장되었습니다. 문자·이메일 알림에 사용됩니다.",
  contactLoadError: "연락처를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
  contactSaveError: "저장에 실패했습니다. 번호·이메일 형식을 확인해 주세요.",
  contactLoading: "연락처 불러오는 중…",
  smsTwilioNotReadyTitle: "Twilio 문자 발송이 준비되지 않았습니다",
  smsTwilioDevPreview:
    "개발 모드: 실제 문자는 보내지 않습니다 (SMS_DEV_PREVIEW). Twilio 업그레이드·미국 번호 Verified 후 .env에서 제거하세요.",
  contactPhoneNotUs:
    "휴대폰 형식을 확인하세요. 한국: 010-XXXX-XXXX · 미국: (512) 555-0100",
  smsTwilioGeoHint:
    "Twilio Console → Messaging → Geo permissions → United States → Enable (오류 21408)",
  contactRequiredFirst: "먼저 「연락처 저장」을 완료해 주세요.",
  nextContact: "다음: 연락처",
  nextPhone: "다음: 콜 포워딩",
  nextJobber: "Jobber (선택)",
  allDone: "필수 연동이 완료되었습니다. AI가 설정한 시간에 콜을 받고 문자로 알려 드립니다.",
  tabOptional: "선택",
  tabSkipped: "건너뜀",
  statusDone: "연결됨",
  statusPending: "설정 필요",
  manageLink: "연동 관리",
  scheduleTitle: "AI 수신 시간대",
  scheduleDescription: "요일·시간을 직접 정하거나, 24시간 AI를 켤 수 있습니다.",
  scheduleAlwaysOn: "24시간 AI",
  scheduleAlwaysOnHint:
    "Vowpath로 들어온 전화에 항상 AI가 응답합니다. 착신전환도 그에 맞게 설정하세요.",
  scheduleValidation: "24시간 AI를 켜거나, 최소 1개 시간대에서 요일을 선택해 주세요.",
  scheduleConfirm: "확인",
  scheduleConfirmed: "AI 수신 시간대가 연결되었습니다",
  jobberTitle: "Jobber 연결 (선택)",
  jobberDescription:
    "이미 Jobber를 쓰는 샵만 연결하세요. 안 써도 문자·대시보드로 예약 확인·승인이 가능합니다. 연결 시 승인(1) 후 Request가 Jobber로 들어갑니다.",
  jobberConnectedSummary: "연결됨: {account}",
  jobberConfirm: "연결 확인",
  jobberConfirmHint: "OAuth 연결 후 「연결 확인」을 눌러 주세요.",
  jobberConfirmed: "Jobber 연결이 저장되었습니다",
  jobberSkip: "Jobber 없이 계속",
  jobberSkippedNote: "Jobber는 건너뛰었습니다. 필요할 때 여기서 다시 연결할 수 있습니다.",
  phoneTitle: "Call forwarding",
  phoneDescription:
    "Keep your published shop number. Forward to the Vowpath number below — Jobber Phone / Dialpad is the easiest setup.",
  forwardingNumberLabel: "Vowpath forwarding number",
  forwardingNumberHint:
    "Paste this into Dialpad, your VoIP portal, or carrier forwarding. Customers still call your main line.",
  forwardingNumberLoading: "Loading number…",
  forwardingNumberMissing:
    "Your Vowpath phone number is not connected yet. Use Developer · Twilio test below, then return here.",
  forwardingCopy: "Copy number",
  forwardingCopied: "Copied",
  forwardingCustomerNote:
    "Customers call your usual shop number. This number is for forwarding only — do not replace your website listing.",
  forwardingScenarioTitle: "1. When should calls forward?",
  forwardingScenarioHint: "Most HVAC shops start with “when you miss a call.”",
  forwardingProviderTitle: "2. What phone system do you use?",
  forwardingProviderHint:
    "Jobber Phone and Dialpad match our step-by-step guide. Cell-carrier setup works too but varies by provider.",
  forwardingDialpadBanner:
    "Recommended: Jobber Phone / Dialpad — follow the steps below for a reliable setup. ServiceTitan Phones Pro uses the same Dialpad flow.",
  forwardingCarrierWarning:
    "Cell-carrier steps differ by Verizon, AT&T, and T-Mobile. Consider Dialpad if you need predictable after-hours routing. iPhone Settings → Call Forwarding only supports forward-all, not no-answer only.",
  forwardingStepsTitle: "3. Setup steps",
  forwardingTestTitle: "4. Test it",
  forwardingTestBody:
    "Call your main shop number. Vowpath should answer after a few rings (or right away after hours). You should get an SMS summary on your cell — reply 1 to approve or 2 to decline.",
  forwardingRecommended: "Popular",
  forwardingRecommendedProvider: "Recommended",
  forwardingConfirmBlocked: "Connect your Vowpath number before marking complete.",
  phoneGuide: "",
  phoneSupport: "",
  phoneConfirm: "Forwarding is set — I tested it",
  phoneConfirmed: "Call forwarding marked complete",
  forwardingDevTitle: "Developer · Twilio test",
  forwardingDevHint:
    "Local Twilio wiring and call simulation only. Production shops only need the guide above.",
  bookingPolicyTitle: "예약 정책 (MVP)",
  bookingPolicyMode: "Request Only",
  bookingPolicyDescription:
    "예약 요청·확정은 업체 휴대폰 문자(SMS)가 메인입니다. 같은 알림이 이메일로도 옵니다(보조). Jobber는 승인(1) 후에만 Request로 들어가며, 캘린더·전체 일정 확인용입니다.",
  ownerAlertsTitle: "업체 알림 채널",
  ownerAlertsDescription:
    "① 문자(SMS): 신규 요청, 고객 재확인(YES/NO), Reply 1=확정·2=거절 — 가장 먼저 확인하세요. ② 이메일: 같은 내용 백업. ③ Jobber: 승인 후 Request 동기화·나중에 전체 확인.",
  auditTitle: "활동 기록",
  auditDescription:
    "최근 승인·거절·intake 이벤트 (최근 30일)",
  auditEmpty: "아직 기록이 없습니다. 요청을 승인하거나 거절하면 여기에 표시됩니다.",
  auditRefresh: "새로고침",
  auditViewBooking: "보기",
  opsFailuresTitle: "최근 시스템 오류",
  opsFailuresDescription:
    "Twilio, AI, Jobber, intake 오류 기록입니다. 같은 오류는 1시간에 한 번만 쌓입니다.",
  opsFailuresTwilioHint:
    "문자(SMS) 전송 실패: Twilio Geo permissions(US SMS), 업체 연락처(+1), Trial Verified 번호를 확인하세요. 터미널에서 npm run sms:diagnose 로 원인을 볼 수 있습니다.",
  opsFailuresRetryable: "재시도 가능",
  opsFailuresRepeatCount: (n: number) => `동일 ${n}회`,
  opsFailuresClear: "기록 지우기",
  opsFailuresClearConfirm: "이 계정의 오류 기록을 모두 지울까요?",
  storageTitle: "서버 저장소",
  storageOk: "저장소 연결됨",
  storageRequired: "프로덕션에 저장소 필요",
  storageStep1: "Vercel → Storage → 데이터베이스 만들기 → KV",
  storageStep2: "이 프로젝트(vowpath)에 연결",
  storageStep3: "배포 → 재배포",
  storageDocHint: "자세한 내용: 프로젝트 루트 KV_SETUP.md",
  backDashboard: "대시보드로 이동",
  backHome: "← 홈으로",
  liveBanner: "연락처 + 시간대 + 포워딩 완료 시 AI 수신·문자 알림 시작",
  support: "문의: {email}",
  sectionSteps: {
    contact: "1",
    schedule: "2",
    phone: "3",
    jobber: "4",
  } as const,
};

export const vowDashboard = {
  nav: {
    dashboard: "대시보드",
    requests: "요청 · 예약",
    missedCalls: "통계 분석",
    settings: "연동 설정",
    shopTools: "샵 도구",
  },
  upgrade: {
    title: "플랜 업그레이드",
    body: "야간·주말 무제한 AI 수신과 문자 승인을 한 번에.",
    cta: "플랜 보기",
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

export const dashboardPage = {
  title: "대시보드",
  subtitle: "야간·overflow 콜과 예약 요청을 한곳에서 확인합니다. 긴급은 문자로 먼저.",
  setupIncomplete:
    "설정이 아직 완료되지 않았습니다. 연동 설정을 마치면 AI 수신이 시작됩니다.",
  setupComplete: "연동 완료 — 설정한 시간에 AI가 inbound 콜을 처리합니다.",
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
  backOnboarding: "연동 설정으로",
};

export const dashboardUi = {
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
      "이번 달 서비스 요청이 아직 없습니다. 인바운드 콜과 Jobber 요청은 AI intake 후 여기에 표시됩니다.",
    emptyNotConnected:
      "이번 달 요청이 아직 없습니다. Jobber를 연결하거나 콜 intake를 켜면 추적이 시작됩니다.",
  },
  recentBookings: {
    liveFeed: "실시간",
    title: "최근 예약",
    subtitle: "최신 서비스 요청 — 최신순",
    viewAll: "전체 보기",
    couldntLoad: "예약을 불러오지 못했습니다",
    emptyTitle: "아직 예약이 없습니다",
    emptyBody:
      "인바운드 콜이나 Jobber 요청이 들어오면 AI intake 후 여기에 표시됩니다.",
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
    shortHint: "Customer Verification Rate",
    periodLabel: "재확인 문자 응답 기준",
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
    customerVerificationTitle: "Customer Verification",
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
      "Customers captured by Vowpath during missed calls, after-hours, and unavailable periods.",
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
    withoutVowpath: "Vowpath 없었다면",
    estimatedMissed: "추정 놓친 콜",
    estimatedMissedBody:
      "야간·주말 또는 AI 수신 시간에 Vowpath가 받은 콜 — 음성사서함·누락됐을 가능성이 큰 건수입니다.",
    periodNote: (period: string) => `${period} 기준 · 새 통화 동기화 시 갱신`,
    howCalculated: "집계 방식",
    howCalculatedBody:
      "저장된 통화·예약 기록만 사용합니다. AI가 받은 콜·살린 고객은 실제 인바운드 통화 기준, 확정 예약·검토 필요는 해당 기간에 접수된 요청 상태 기준입니다.",
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
    trendSubtitleJobber: "Jobber 작업 요청 + Vowpath 예약",
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

export const messagingSetup = {
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

export const phoneSetup = {
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
    "비용: Vowpath는 자동 결제 없음. Twilio는 실제 전화·월 번호요금, OpenAI는 Job Card 생성 시 API 사용료만 (시뮬레이션도 OpenAI 소액). Trial 크레딧 소진 전까지 청구 없을 수 있음.",
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

export const inboundCalls = {
  title: "인바운드 통화",
  subtitle: "Twilio로 들어온 통화에서 만든 Job Card",
  loading: "불러오는 중…",
  empty: "아직 통화 기록이 없습니다. Twilio 테스트 통화 후 여기에 표시됩니다.",
  unknownCustomer: "고객명 미상",
};

export const jobberConnect = {
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
    "로컬 개발용으로 http://localhost:3000/api/jobber/callback 도 함께 등록해 두세요.",
  push: "Jobber로 보내기",
  pushing: "Jobber 전송 중…",
  pushed: "Jobber에 생성됨",
  pushError: "Jobber 전송에 실패했습니다.",
  openJobber: "Jobber에서 열기",
};

export const jobCardGenerator = {
  eyebrow: "v1 · 지금 사용 가능",
  title: "콜 메모 → Job Card",
  subtitle:
    "야간·주말 통화 내용을 붙여넣으면 긴급도(긴급·당일·일반)와 Jobber용 메모 초안을 만듭니다. 확인 후 붙여넣기.",
  badge: "예약 승인 모드",
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

export const authPages = {
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
    subtitle: "Vowpath 대시보드에 접속합니다.",
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
    shopLabel: "Shop 이름",
    shopPlaceholder: "예: Cool Air HVAC",
    emailLabel: "이메일",
    passwordLabel: "비밀번호",
    passwordHint: "8자 이상",
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
  },
};

export const legalPages = {
  privacy: {
    title: "개인정보처리방침",
    updated: "2026년 3월",
    sections: [
      {
        heading: "수집 항목",
        body: "이메일, shop 이름, 결제 정보(Stripe), Jobber 연동 시 고객·예약 메타데이터, 통화 로그(연동 시).",
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
        heading: "문의",
        body: `개인정보 관련 문의: ${SITE.supportEmail}`,
      },
    ],
  },
  terms: {
    title: "이용약관",
    updated: "2026년 3월",
    sections: [
      {
        heading: "서비스",
        body: "Vowpath는 HVAC shop의 맞춤 시간대 inbound 콜을 처리하고 Jobber 등 FSM에 예약을 반영하는 운영 소프트웨어입니다.",
      },
      {
        heading: "요금·환불",
        body: "구독 요금은 결제 시 안내된 플랜에 따릅니다. 파일럿 기간 환불 정책은 별도 안내를 따릅니다.",
      },
      {
        heading: "책임",
        body: "긴급 상황의 최종 판단·dispatch는 shop 오너에게 있습니다. AI·자동 예약은 보조 도구이며 100% 정확성을 보장하지 않습니다.",
      },
      {
        heading: "문의",
        body: `약관 문의: ${SITE.supportEmail}`,
      },
    ],
  },
};
