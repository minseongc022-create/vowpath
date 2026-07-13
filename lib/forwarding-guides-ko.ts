/** 착신 전환 가이드 — 검증된 US 경로. */

export type ForwardingScenarioId = "overflow";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours" | "busy_and_after_hours";

export type ForwardingProviderId =
  | "effiroad_main"
  | "dialpad"
  | "google_voice"
  | "att"
  | "tmobile"
  | "verizon";

export type ForwardingProvider = {
  id: ForwardingProviderId;
  label: string;
  hint: string;
  recommended?: boolean;
};

export function isDirectEffiroadLineProvider(provider: ForwardingProviderId): boolean {
  return provider === "effiroad_main";
}

export function normalizeForwardingScenario(
  _scenario?: LegacyForwardingScenarioId | string,
): ForwardingScenarioId {
  return "overflow";
}

export function normalizeForwardingProvider(value?: string | null): ForwardingProviderId {
  if (
    value === "effiroad_main" ||
    value === "dialpad" ||
    value === "google_voice" ||
    value === "att" ||
    value === "tmobile" ||
    value === "verizon"
  ) {
    return value;
  }
  if (value === "carrier") return "att";
  if (value === "voip" || value === "other") return "dialpad";
  return "effiroad_main";
}

export const FORWARDING_OVERFLOW_SUMMARY =
  "가게 번호가 먼저 울립니다. 약 20초 안에 받지 않으면 Effiroad로 넘어갑니다.";

export const FORWARDING_EFFIROAD_MAIN_SUMMARY =
  "착신 전환 없음. Effiroad 번호를 구글·웹사이트·트럭에 올리면 고객이 직접 거는 구조입니다. 응대 시간은 설정에서 조절합니다.";

export const FORWARDING_AFTER_HOURS_NOTE =
  "야간·주말: 설정 → 응대 시간에서 스케줄 밖은 Effiroad가 응답합니다.";

export const FORWARDING_IPHONE_WARNING =
  "iPhone 설정 → 전화 → 착신전환은 모든 전화를 넘깁니다. 아래 단계만 사용하세요.";

export const FORWARDING_PROVIDER_NOTE =
  "Effiroad 메인 번호, Google Voice, Dialpad, AT&T, T-Mobile, Verizon 기준 검증 단계입니다.";

export const FORWARDING_PROVIDERS: ForwardingProvider[] = [
  {
    id: "effiroad_main",
    label: "Effiroad 번호를 메인으로",
    hint: "가장 단순 — 코드 없음. 구글·웹·트럭 번호만 교체",
    recommended: true,
  },
  {
    id: "dialpad",
    label: "Jobber Phone · Dialpad",
    hint: "Dialpad — 미응답 시 외부 번호",
  },
  {
    id: "google_voice",
    label: "Google Voice",
    hint: "GV 샵 번호 — voice.google.com에서 착신",
  },
  {
    id: "att",
    label: "AT&T Wireless",
    hint: "AT&T 휴대폰 — **61* 코드",
  },
  {
    id: "tmobile",
    label: "T-Mobile",
    hint: "T-Mobile (Metro, Mint 등)",
  },
  {
    id: "verizon",
    label: "Verizon Wireless",
    hint: "Verizon — *71 또는 My Verizon",
  },
];

export const FORWARDING_TROUBLESHOOTING: Record<ForwardingProviderId, string[]> = {
  effiroad_main: [
    "구글 비즈니스 프로필 반영에 24~48시간 걸릴 수 있습니다.",
    "테스트는 Effiroad 번호로 직접 걸어야 합니다.",
    "옛 번호는 인쇄물 소진 전까지 병행 가능합니다.",
  ],
  dialpad: [
    "고객이 거는 가게 번호를 맞게 선택했는지 확인하세요.",
    "미응답 시 전환만 — 무조건 착신 금지.",
    "Effiroad 번호에 +1 포함.",
    "저장 후 1분 뒤 테스트.",
  ],
  google_voice: [
    "PC 브라우저에서 voice.google.com 사용.",
    "번호 연결 실패 시 휴대폰 통신사 경로(AT&T/T-Mobile/Verizon) 사용.",
    "연결 기기가 전화를 가로채지 않는지 확인.",
  ],
  att: [
    "AT&T 휴대폰에서 직접 코드 실행.",
    "확인 톤/문자 대기.",
    "실패 시 AT&T에 조건부 착신전환 요청.",
    "해제: ##61#",
  ],
  tmobile: [
    "T-Mobile 회선에서 실행.",
    "확인 톤/문자 대기.",
    "해제: ##61# 또는 ##004#",
  ],
  verizon: [
    "*71 먼저, My Verizon 대안.",
    "*72 금지.",
    "Live Voicemail 끄기.",
  ],
};

export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE: Record<ForwardingProviderId, string> = {
  effiroad_main: "기존 번호를 유지하려면 위에서 통신사/Dialpad 선택.",
  dialpad: "막히면 휴대폰 통신사 경로 시도.",
  google_voice: "GV 실패 시 Effiroad 메인 번호 또는 통신사 경로.",
  att: "Dialpad 사용 시 제공자 변경.",
  tmobile: "Dialpad 사용 시 제공자 변경.",
  verizon: "막히면 아래 우회 가이드 참고.",
};

export const FORWARDING_TROUBLESHOOTING_FALLBACK =
  "support@effiroad.com — 통신사 이름과 함께 문의.";

export function getForwardingGuideSteps(
  provider: ForwardingProviderId,
  _scenario: LegacyForwardingScenarioId,
  effiroadNumber: string,
): string[] {
  const num = effiroadNumber || "(Effiroad 번호)";
  const tenDigit = num.replace(/\D/g, "").slice(-10) || "10자리";
  const e164 = tenDigit.length === 10 ? `+1${tenDigit}` : num;

  if (provider === "effiroad_main") {
    return [
      `Effiroad 번호 복사: ${e164}`,
      "Google 비즈니스 프로필 → 연락처 → 전화 → Effiroad 번호 저장.",
      "웹사이트·페이스북 헤더/푸터 번호 교체.",
      "트럭·간판·명함 — 새 인쇄부터 Effiroad 번호.",
      "Jobber(선택): Settings → Company phone.",
      "Angi, Yelp 등 리스팅 전화번호 업데이트.",
      "통신사 착신 코드 불필요.",
      FORWARDING_AFTER_HOURS_NOTE,
      `테스트: 다른 폰에서 ${e164} 로 직접 전화.`,
    ];
  }

  if (provider === "google_voice") {
    return [
      "PC에서 https://voice.google.com 로그인 (샵 GV 계정).",
      "톱니바퀴 → Calls.",
      "미응답 시 전환 / Call forwarding → 외부 번호.",
      `목적지: ${e164}`,
      "번호 인증 요청 시 Effiroad가 받는지 테스트 단계에서 확인.",
      "연결 기기가 전화를 가로채면 끄기.",
      "GV만으로 ‘몇 초 울리고 넘기기’가 어려우면 Effiroad 메인 번호 또는 **61* 사용.",
      "테스트: GV 번호로 전화.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "https://dialpad.com/app 접속.",
      "Settings → Users → 샵 회선.",
      "미응답 시 → Forward to external.",
      `${e164} 입력 후 저장.`,
      "Jobber Phone: Jobber → Settings → Phone.",
      "가게 번호로 테스트.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    return [
      "AT&T 샵 휴대폰 사용.",
      `입력: ${code} → 통화.`,
      "확인 톤/문자 대기.",
      "해제: ##61#",
      FORWARDING_IPHONE_WARNING,
      "가게 번호로 테스트.",
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}**20#`;
    const alt = `**61*1${tenDigit}#`;
    return [
      "T-Mobile 샵 휴대폰.",
      `입력: ${code} → 통화 (미응답 약 20초).`,
      `실패 시: ${alt} (통신사 기본 링 시간).`,
      "확인 톤/문자 대기.",
      "해제: ##61# 또는 ##004#",
      FORWARDING_IPHONE_WARNING,
      "가게 번호로 테스트.",
    ];
  }

  return [
    `*71${tenDigit} (Verizon 공식)`,
    "또는 My Verizon → 미응답 시 착신.",
    `목적지 ${e164}`,
    FORWARDING_IPHONE_WARNING,
    "가게 번호로 테스트.",
  ];
}

export const FORWARDING_SCENARIOS = [
  {
    id: "overflow" as const,
    label: "부재 시 넘기기",
    summary: FORWARDING_OVERFLOW_SUMMARY,
    recommended: true,
  },
];
