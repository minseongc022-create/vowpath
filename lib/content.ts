import { SITE, CHECKOUT_CTA } from "./constants";
import { IS_BETA } from "./beta";

export const hero = IS_BETA
  ? {
      badge: "퍼블릭 베타 · 미국 residential HVAC · Jobber",
      headline: "야간·주말 통화 메모 →",
      headlineAccent: "Jobber용 Job Card",
      subhead:
        "밤이나 주말에 받은 통화 내용을 붙여넣으면, AI가 긴급도(긴급·당일·일반)·주소·배차 메모를 약 10초 안에 정리합니다. Jobber에 넣기 전에 직접 확인하세요.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "작동 방식 보기",
      note: "무료 베타 · 전화 AI는 준비 중 · 지금은 Jobber에 붙여넣기",
    }
  : {
      badge: "미국 residential HVAC · Jobber 예약까지",
      headline: "놓친 전화 =",
      headlineAccent: "잃은 매출",
      subhead:
        "원하는 시간대만 설정하세요. 그 시간에 들어오는 HVAC 콜은 AI가 받고, 긴급도를 나눈 뒤 Jobber에 예약까지 넣습니다.",
      primaryCta: CHECKOUT_CTA,
      secondaryCta: "제품 보기",
      note: `맞춤 시간대 직접 설정 · 정액 ${SITE.monthlyPrice}/월 또는 성과형 ${SITE.flexBasePrice}/월 + 예약당 ${SITE.flexPerBooking}`,
    };

export const signupFlow = {
  title: "결제 후 10분 안에 연동",
  subtitle: "상담 없음. 결제 → 시간대 설정 → Jobber 연결 → 라이브.",
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
      title: "Jobber 연결",
      description: "OAuth 한 번. 예약·고객 정보가 Jobber로 바로 들어갑니다.",
      time: "3분",
    },
    {
      step: "04",
      title: "콜 포워딩 → 라이브",
      description: "설정한 시간에만 AI가 받습니다. Job Card + SMS 알림 시작.",
      time: "5분",
    },
  ],
};

export const differentiators = {
  title: "Vowpath가 하는 일",
  subtitle:
    "HVAC shop이 정한 시간에만 켜지고, intake → triage → Jobber 예약 → dispatch-ready Job Card까지 이어지는 운영 도구입니다.",
  items: [
    {
      title: "맞춤 수신 시간대",
      description:
        "평일 저녁, 점심 overflow, 주말 on-call, 피크 시 바쁠 때만 — 요일·시간을 대시보드에서 직접 설정합니다. shop이 켠 window에만 AI가 받습니다.",
    },
    {
      title: "Dispatcher Job Card",
      description:
        "주소, ZIP, 장비, 증상, 긴급도(긴급·당일·일반)가 배정용 한 장으로 정리됩니다. transcript를 길게 듣지 않아도 아침 dispatch board에 바로 올릴 수 있습니다.",
    },
    {
      title: "예약 승인 모드",
      description:
        "AI가 Job Card 초안을 만들고, 오너가 확인한 뒤 Jobber에 확정할 수 있습니다. auto-book 전에 검수하고 싶은 shop에 맞습니다.",
    },
    {
      title: "Jobber 예약 연동",
      description:
        "기존 Jobber 캘린더·고객 데이터에 confirmed appointment가 들어갑니다. 별도 FSM 이전 없이 지금 쓰는 workflow를 그대로 이어갑니다.",
    },
    {
      title: "설정 시간 내 무제한 콜",
      description:
        "AI가 켜져 있는 시간대 inbound는 통당·분당 추가 과금 없이 처리합니다. 7–8월 no-cool rush에도 정액 플랜 요금은 동일합니다.",
    },
    {
      title: "HVAC 분류 + 긴급(P1) 즉시 SMS",
      description:
        "no-heat / no-cool / 누수 / 실내온도 질문으로 긴급·당일·일반으로 나눕니다. 긴급(P1)이면 오너·당직 기사에게 즉시 SMS — 통화만 받고 끝나지 않습니다.",
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
  subtitle: "설정한 시간에만 자동으로 돌아갑니다.",
  steps: [
    {
      step: "01",
      title: "수신 시간대 설정",
      description:
        "대시보드에서 요일·시간 지정. 그 외 시간에는 기존 메인 라인 그대로.",
    },
    {
      step: "02",
      title: "AI 수집 · 긴급도 분류",
      description:
        "HVAC 전용 접수 → 긴급·당일·일반 분류. 서비스 ZIP 밖이면 안내 후 종료.",
    },
    {
      step: "03",
      title: "Jobber 예약 · 알림",
      description:
        "승인 모드 또는 자동 예약. Job Card 생성 + 고객 SMS + 긴급(P1) 즉시 알림.",
    },
  ],
};

export const features = {
  title: "HVAC shop에 필요한 기능만",
  subtitle: "야간·overflow·주말 콜을 HVAC dispatch workflow에 맞춰 처리하는 운영 도구입니다.",
  items: [
    {
      title: "요일·시간대 스케줄",
      description:
        "여러 구간 추가 가능. 저녁·점심·주말·피크를 각각 다르게 설정.",
    },
    {
      title: "HVAC 긴급 triage",
      description: "no-heat, no-cool, maintenance + 실내온도·누수·다운 여부.",
    },
    {
      title: "Jobber 네이티브 예약",
      description: "실제 슬롯. 기존 Jobber 플랜 그대로 사용.",
    },
    {
      title: "Dispatcher Job Card",
      description: "배정용 구조화 데이터 — transcript 정리 시간 제거.",
    },
    {
      title: "예약 승인 / 자동 선택",
      description: "초안만 만들지, 바로 넣을지 — shop 정책에 맞게.",
    },
    {
      title: "정액 · 무제한 (설정 시간 내)",
      description: `월 ${SITE.monthlyPrice}. AI ON 시간대 콜 수 제한 없음.`,
    },
  ],
};

export const pricing = {
  title: "가격",
  subtitle: "피크에 콜이 많으면 정액, 가끔이면 성과형. 둘 다 맞춤 시간대·Jobber 연동.",
  compare: [
    { label: "맞춤 수신 시간대", amount: "무제한 구간" },
    { label: "Jobber 예약 + Job Card", amount: "포함" },
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
        "Jobber 예약 · Job Card",
        "예약 승인 모드 · 긴급(P1) SMS",
        "월 요금만 — 예약 많아도 동일",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — 정액`,
    },
    {
      id: "flex" as const,
      name: "성과형 Flex",
      badge: "쓴 만큼만",
      description: "야간 콜이 적은 shop. Jobber에 잡힐 때만 추가 과금.",
      price: SITE.flexBasePrice,
      period: "/월",
      usageLine: `+ Jobber 확정 예약 1건당 ${SITE.flexPerBooking}`,
      features: [
        "정액과 동일한 AI · Jobber · Job Card",
        "맞춤 수신 시간대",
        "예약 승인 모드",
        "월 기본료 + 확정 예약당 수수료",
        "콜만 받고 예약 0건 → 기본료만",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — 성과형`,
    },
  ],
  tip: `월 Jobber 예약 약 9건 이상이면 정액(${SITE.monthlyPrice})이 보통 더 쌉니다.`,
  footnote:
    "성과형: 기본료는 매월, 예약 수수료는 Jobber에 확정된 건만 (스팸·취소 제외). 긴급 1건만 잡혀도 수수료만으로도 본전인 경우가 많습니다.",
};

export const faq = {
  title: "자주 묻는 질문",
  items: [
    {
      q: "낮 시간은 AI가 안 받나요?",
      a: "낮에 ‘안 받는다’가 아니라, 당신이 정한 시간에만 받습니다. 낮 9–5는 메인 라인, 저녁·점심·주말만 AI — 이렇게 설정하는 shop이 많습니다.",
    },
    {
      q: "시간대는 어떻게 설정하나요?",
      a: "온보딩 후 대시보드에서 요일·시작·종료 시간을 추가합니다. 여러 구간(야간+점심+주말)을 동시에 둘 수 있습니다.",
    },
    {
      q: "상담 없이 바로 시작할 수 있나요?",
      a: "네. 결제 → 시간대 설정 → Jobber 연결 → 포워딩 순서입니다.",
    },
    {
      q: "Jobber 꼭 써야 하나요?",
      a: "네. Vowpath는 Jobber에 appointment를 넣는 것이 core입니다. Housecall Pro 연동은 로드맵에 있습니다.",
    },
    {
      q: "어떤 HVAC shop에 맞나요?",
      a: "미국 residential HVAC, owner-operator, 야간·주말·피크 overflow 콜을 Jobber로 받고 싶은 shop입니다. dispatcher가 작거나 없는 팀도 잘 맞습니다.",
    },
    {
      q: "예약 승인 모드가 뭔가요?",
      a: "AI가 Jobber에 넣기 전 오너에게 초안 Job Card를 보냅니다. 확인 후 확정 — 소규모 shop에서 잘못된 자동 예약을 막습니다.",
    },
    {
      q: "정액이랑 성과형, 뭐가 다른가요?",
      a: `정액(${SITE.monthlyPrice}/월)은 설정 시간 내 콜·Jobber 예약이 무제한입니다. 성과형(${SITE.flexBasePrice}/월 + 예약 1건당 ${SITE.flexPerBooking})은 기본료는 낮고, Jobber에 실제로 잡힌 예약만 수수료가 붙습니다. 야간 콜이 많으면 정액, 가끔이면 성과형이 유리합니다.`,
    },
    {
      q: "성과형 수수료는 언제 청구되나요?",
      a: "Jobber에 확정 반영된 예약 1건당 과금됩니다. 통화만 하고 예약이 없으면 기본료만, 스팸·취소 건은 제외합니다.",
    },
  ],
};

export const cta = {
  title: "밤에 놓친 콜, 내일 아침 Jobber에",
  subtitle: "시간대 정하고 · 결제하고 · 오늘부터.",
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
  afterPay: "결제 완료 후 → 연동 설정(시간대 · Jobber · 포워딩) 약 10분",
};

export const onboardingPage = {
  title: "연동 설정",
  subtitle: "결제 완료. 시간대와 Jobber만 설정하면 라이브입니다.",
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
      id: "jobber",
      title: "Jobber 연결",
      description: "예약·고객 동기화. OAuth 연동.",
      action: "Jobber 연결하기",
      status: "ready" as const,
    },
    {
      id: "phone",
      title: "콜 포워딩",
      description: "설정한 시간에 인바운드가 Vowpath로 오도록 포워딩.",
      action: "포워딩 가이드",
      status: "locked" as const,
    },
  ],
  liveBanner: "시간대 + Jobber + 포워딩 완료 시 AI 수신 시작",
  support: `문의: ${SITE.supportEmail}`,
  completeAction: "대시보드로 이동",
};

export const settingsPage = {
  title: "연동 설정",
  subtitle: "AI 수신 시간대, Jobber, 콜 포워딩을 한곳에서 관리합니다.",
  badge: "연동 설정",
  paidBadge: "결제 완료",
  paidWelcome: "결제가 완료되었습니다. 아래 3가지만 설정하면 AI 수신을 시작할 수 있습니다.",
  progressTitle: "연동 {done}/{total} 완료",
  progressSummary: "연동 {done}/{total} 완료",
  progressHint: "각 항목을 설정한 뒤 확인을 눌러 주세요.",
  scrollHint: "아래로 스크롤하면 Jobber·콜 포워딩 단계가 이어집니다.",
  tocLabel: "바로 가기",
  tocSchedule: "① 시간대",
  tocJobber: "② Jobber",
  tocPhone: "③ 포워딩",
  nextJobber: "다음: Jobber 연결",
  nextPhone: "다음: 콜 포워딩",
  allDone: "모든 연동이 완료되었습니다. AI가 설정한 시간에 콜을 받습니다.",
  statusDone: "연결됨",
  statusPending: "설정 필요",
  manageLink: "연동 관리",
  scheduleTitle: "AI 수신 시간대",
  scheduleDescription: "요일과 시간을 정하면 해당 시간에 AI가 콜을 받습니다.",
  scheduleValidation: "최소 1개 시간대에서 요일을 선택해 주세요.",
  scheduleConfirm: "확인",
  scheduleConfirmed: "AI 수신 시간대가 연결되었습니다",
  jobberTitle: "Jobber 연결",
  jobberDescription: "Jobber 계정을 연결하면 Job Card를 Request로 보낼 수 있습니다.",
  jobberConnectedSummary: "연결됨: {account}",
  jobberConfirm: "확인",
  jobberConfirmHint: "Jobber 연결이 완료되면 확인을 눌러 다음 단계로 이동하세요.",
  jobberConfirmed: "Jobber 연결이 확인되었습니다",
  phoneTitle: "콜 포워딩",
  phoneDescription: "야간·overflow 번호를 Vowpath로 포워딩합니다.",
  phoneGuide:
    "통신사 또는 Jobber 전화 설정에서 after-hours·overflow 번호를 Vowpath Twilio 번호로 포워딩하세요. 파일럿 샵은 지원팀이 직접 안내합니다.",
  phoneSupport: "설정이 끝나면 아래 「포워딩 설정 완료」를 눌러 주세요.",
  phoneConfirm: "포워딩 설정 완료",
  phoneConfirmed: "콜 포워딩 설정이 완료되었습니다",
  backDashboard: "대시보드로 이동",
  backHome: "← 홈으로",
  liveBanner: "3가지 모두 완료하면 AI 수신이 시작됩니다",
  support: "문의: {email}",
  sectionSteps: {
    schedule: "1",
    jobber: "2",
    phone: "3",
  } as const,
};

export const dashboardPage = {
  title: "대시보드",
  subtitle: "야간·overflow 콜과 Jobber 예약을 한곳에서 확인합니다.",
  setupIncomplete:
    "설정이 아직 완료되지 않았습니다. 연동 설정을 마치면 AI 수신이 시작됩니다.",
  setupComplete: "연동 완료 — 설정한 시간에 AI가 inbound 콜을 처리합니다.",
  stats: {
    tonightCalls: "오늘 밤 콜",
    bookings: "Jobber 예약",
    pendingApproval: "승인 대기",
  },
  scheduleTitle: "AI 수신 시간대",
  scheduleEmpty: "등록된 시간대가 없습니다.",
  scheduleSetup: "연동 설정에서 시간대 설정하기",
  scheduleEdit: "연동 설정에서 수정",
  jobsTitle: "Jobber 예약 · Job Card",
  jobsEmptyTitle: "아직 예약이 없습니다",
  jobsEmptyBody:
    "위에서 콜 메모를 붙여넣고 Job Card를 만든 뒤 「승인 대기로 저장」을 누르면 여기에 표시됩니다.",
  jobsEmptyHint: "전화 AI·Jobber 자동 연동은 다음 단계입니다.",
  jobStatus: {
    confirmed: "Jobber 확정",
    pending_approval: "승인 대기",
    sms_sent: "SMS 발송 완료",
  },
  backOnboarding: "연동 설정으로",
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
    "한국 휴대폰 실전화 테스트: Twilio Upgrade 또는 미국(+1) Verified 번호로 발신해야 합니다.",
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
  unknownCustomer: "Unknown",
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
    phonePlaceholder: "010-1234-5678",
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
    phonePlaceholder: "010-1234-5678",
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
    subtitle: "정보 입력 후 「인증번호 보내기」를 눌러 이메일로 본인 확인을 완료하세요.",
    subtitleVerify: "받은 6자리 인증번호를 입력하면 가입이 완료됩니다.",
    shopLabel: "Shop 이름",
    shopPlaceholder: "예: Cool Air HVAC",
    emailLabel: "이메일",
    passwordLabel: "비밀번호",
    passwordHint: "8자 이상",
    phoneLabel: "휴대폰 (선택)",
    phoneLabelRequired: "휴대폰 번호",
    phonePlaceholder: "010-1234-5678",
    phoneHintOptional: "입력하면 전화 로그인·비밀번호 찾기 문자 인증에 사용됩니다. 비워도 이메일 인증으로 가입할 수 있습니다.",
    phoneHintSms: "문자 인증번호를 이 번호로 보냅니다. (필수)",
    phoneRequiredSms: "문자(SMS) 인증을 선택했으면 휴대폰 번호를 입력해 주세요.",
    verifyChannelLabel: "인증번호 받기",
    verifyChannelEmail: "이메일로 받기 (추천)",
    verifyChannelSms: "문자(SMS)로 받기",
    verifyChannelHint: "이메일 인증이 기본입니다. 문자를 선택할 때만 휴대폰 번호가 필수입니다.",
    sendCode: "인증번호 보내기",
    sendCodeNote: "「계정 만들기」가 아니라 위 버튼으로 인증번호를 먼저 받으세요.",
    sentCodeMessage: "인증번호를 보냈습니다. 이메일 또는 문자함을 확인해 주세요.",
    codeLabel: "인증번호 (6자리)",
    codeHint: "10분 내에 입력해 주세요. 타인에게 공유하지 마세요.",
    completeSignup: "인증하고 가입 완료",
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
