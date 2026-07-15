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
    "고객이 거는 가게 번호(메인 회선)를 맞게 선택했는지 확인하세요.",
    "미응답 / Fallback만 — 무조건 착신(Always forward) 금지.",
    "ServiceTitan Phones Pro: Dialpad Main Line에서 Fallback + Closed Hours 둘 다 설정.",
    "Main Line에 Fallback이 없으면 Contact Center → 기본 센터에서 동일 설정.",
    "Effiroad 번호에 +1 포함, 발신자 번호 전달(caller ID pass-through) 켜기.",
    "저장 후 “Changes saved” 확인, 1분 뒤 테스트.",
  ],
  google_voice: [
    "PC 브라우저에서 voice.google.com/settings 사용.",
    "전환 전: Screen calls 끄기, “Show my Google Voice number as caller ID” 끄기.",
    "My Devices에서 개인폰 동시 울림 끄기 — overflow 테스트 방해.",
    "Linked numbers에 Effiroad 추가, 전화 인증(Effiroad가 코드 수신).",
    "GV만으로 ‘몇 초 울리고 넘기기’ 어려움 — **61*/*71 또는 Effiroad 메인 번호.",
    "GV가 아닌 다른 폰으로 GV 번호에 테스트 전화.",
  ],
  att: [
    "AT&T 휴대폰에서 직접 코드 실행.",
    "조건부 코드(**61*, *61*, *62*, *67*)만 — *21*(전체 착신) 금지.",
    "확인 톤/문자 대기.",
    "실패 시 AT&T (800) 331-0500 — conditional call forwarding 개통 요청.",
    "해제: ##61#, ##62#, ##67#",
  ],
  tmobile: [
    "T-Mobile 회선에서 실행.",
    "**61* / *61*만 — **21*(전체 착신) 금지.",
    "확인 톤/문자 대기.",
    "선불 요금제는 차단될 수 있음 — T-Mobile에 개통 요청.",
    "해제: ##61# 또는 ##004#",
  ],
  verizon: [
    "*71 먼저(공식 조건부), My Verizon 대안.",
    "*72(전체 착신) 금지.",
    "웹: m.vzw.com/callforwarding → 미응답 시만.",
    "선불: *71만 사용(앱 불가인 경우 많음).",
    "Live Voicemail 끄기.",
    `막히면 Verizon 800-922-0204 — 조건부 착신전환 요청.`,
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
      "PC에서 https://voice.google.com/settings 로그인 (샵 GV 계정).",
      "Calls 탭 — 전환 전 설정 (Ruby/Smith.ai/Jobber 검증):",
      "  • Screen calls 끄기 (추가 안내 없이 Effiroad 연결).",
      "  • “Show my Google Voice number as caller ID when forwarding” 끄기 (실제 발신자 번호 필요).",
      "  • My Devices: 개인폰/태블릿 동시 울림 끄기.",
      "Linked numbers → New linked number → Effiroad 번호 → Send code.",
      `목적지: ${e164} (+1 포함).`,
      "인증: 전화(가능하면 문자 아님) — Effiroad가 6자리 코드 수신하는지 테스트 단계에서 확인.",
      "Calls → Linked numbers에서 Effiroad로 전환 ON. 목적지는 하나만.",
      "한계: GV만으로 ‘휴대폰 먼저 울리고 20초 후 Effiroad’ 어려움 — AT&T/T-Mobile/Verizon **61*/*71 또는 Effiroad 메인 번호.",
      "Jobber 방식(GV→전용 AI 번호) 사용 시: 수신 측 짧은 answer delay 권장.",
      "테스트: GV 번호로 전화.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "경로 A — ServiceTitan Phones Pro / Main Line (Avoca·Smith.ai 검증):",
      "https://dialpad.com/officesettings → Admin Settings → Main Line.",
      "Business Hours & Call Routing → Edit Call Routing.",
      "Fallback Options(또는 Other routing) → “To a team member, room phone, or external number”.",
      `${e164} 입력 후 Enter — “Changes saved” 확인.`,
      "Closed Hours Routing에도 동일 Effiroad 번호.",
      "Main Line에 Fallback 없으면 Contact Center → 기본 센터 → 동일 단계.",
      "경로 B — 사용자/Jobber Phone:",
      "https://dialpad.com/app → Settings → Users → 샵 회선 → 미응답 시 → Forward to external.",
      `Jobber: Settings → Phone → 미응답 → 외부 번호 ${e164}.`,
      "경로 C — Department: Admin Settings → Departments → Call Routing → external.",
      "발신자 번호 전달(caller ID pass-through) 켜기.",
      "external number 비활성 시 Dialpad 지원에 forward-to-external 활성화 요청.",
      "가게 번호로 테스트.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    const iphone10 = `*61*1${tenDigit}*11*10#`;
    const unreachable = `*62*1${tenDigit}#`;
    const busy = `*67*1${tenDigit}#`;
    const alt = `**61*1${tenDigit}#`;
    return [
      "AT&T 샵 휴대폰 사용 (Cricket, Straight Talk 포함).",
      "*21* 금지 — 조건부 코드만 사용.",
      "기본 — 미응답 약 20초:",
      `  ${code}`,
      `실패 시: ${alt}`,
      "iPhone/AT&T 대체 (Smith.ai 검증):",
      `  10초: ${iphone10}`,
      `  통화불가: ${unreachable}`,
      `  통화중: ${busy}`,
      "해제: ##61#, ##62#, ##67#",
      "코드 실패: AT&T (800) 331-0500 — conditional call forwarding 요청.",
      FORWARDING_IPHONE_WARNING,
      "가게 번호로 테스트.",
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}**20#`;
    const alt = `**61*1${tenDigit}#`;
    const busy = `*67*${tenDigit}#`;
    const unreachable = `*62*${tenDigit}#`;
    return [
      "T-Mobile 샵 휴대폰 (Metro, Mint 포함).",
      "**21* 금지 — 조건부만.",
      "기본 — 미응답 약 20초:",
      `  ${code}`,
      `실패 시: ${alt}`,
      "선택 (통화중/통화불가):",
      `  통화중: ${busy}`,
      `  통화불가: ${unreachable}`,
      "해제: ##61#, ##67#, ##62#, ##004#",
      FORWARDING_IPHONE_WARNING,
      "가게 번호로 테스트.",
    ];
  }

  return [
    "방법 A — *71 (Verizon 공식, Smith.ai 검증):",
    `*71${tenDigit} → 통화. *72(전체 착신) 금지.`,
    "해제: *73",
    "방법 B — m.vzw.com/callforwarding → 미응답 시만.",
    `목적지 ${e164}`,
    "방법 C — My Verizon 앱 → 미응답 착신.",
    FORWARDING_IPHONE_WARNING,
    "iPhone Live Voicemail 끄기.",
    "25초 이상 울리게 테스트.",
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
