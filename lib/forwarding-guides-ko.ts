/** 착신 전환 가이드 — 검증된 US 경로. */

export type ForwardingScenarioId = "overflow";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours" | "busy_and_after_hours";

export type ForwardingProviderId =
  | "effiroad_main"
  | "dialpad"
  | "google_voice"
  | "att"
  | "tmobile"
  | "verizon"
  | "xfinity"
  | "ringcentral"
  | "grasshopper";

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
    value === "verizon" ||
    value === "xfinity" ||
    value === "ringcentral" ||
    value === "grasshopper"
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
  {
    id: "xfinity",
    label: "Xfinity Mobile",
    hint: "Xfinity 휴대폰 — *71",
  },
  {
    id: "ringcentral",
    label: "RingCentral",
    hint: "RingCentral admin — 순차 울림 후 외부 번호",
  },
  {
    id: "grasshopper",
    label: "Grasshopper",
    hint: "Grasshopper extension — Effiroad 착신 추가",
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
  xfinity: ["*71만 — Xfinity 폰에서만 활성화.", "*72 금지.", "실패 시 Effiroad 전용번호."],
  ringcentral: ["순차 울림 5–8초 후 external.", "Simultaneous 금지.", "caller ID pass-through."],
  grasshopper: ["Extension → forwarding → direct connect.", "press-1 screening 끄기."],
};

export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE: Record<ForwardingProviderId, string> = {
  effiroad_main: "기존 번호를 유지하려면 위에서 통신사/Dialpad 선택.",
  dialpad: "막히면 휴대폰 통신사 경로 시도.",
  google_voice: "GV 실패 시 Effiroad 메인 번호 또는 통신사 경로.",
  att: "Dialpad 사용 시 제공자 변경.",
  tmobile: "Dialpad 사용 시 제공자 변경.",
  verizon: "막히면 아래 우회 가이드 참고.",
  xfinity: "Xfinity는 폰에서만 *71 — 안 되면 Effiroad 전용번호.",
  ringcentral: "RingCentral UI 다르면 support 문서 — 또는 Effiroad 전용번호.",
  grasshopper: "press 1 안내 끄기 — direct connect.",
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
  const national =
    tenDigit.length === 10
      ? `(${tenDigit.slice(0, 3)}) ${tenDigit.slice(3, 6)}-${tenDigit.slice(6)}`
      : num;

  if (provider === "effiroad_main") {
    return [
      `위 초록색 박스에서 Effiroad 번호 ${national} 를 복사하세요.`,
      "Google 비즈니스 프로필 → 프로필 수정 → 연락처 → 전화 → Effiroad 번호 붙여넣기 → 저장. (반영까지 24~48시간 걸릴 수 있습니다.)",
      "웹사이트·페이스북·Nextdoor 등에 보이는 전화번호도 같은 Effiroad 번호로 바꾸세요.",
      "트럭·간판·명함은 새로 인쇄할 때부터 Effiroad 번호를 쓰세요. 옛 번호는 개인 연락처에만 두면 됩니다.",
      "Jobber를 쓰면 Settings → Company phone 도 Effiroad 번호로 맞추세요 (선택).",
      "통신사 착신 코드(*71, **61* 등)는 필요 없습니다.",
      `테스트: 다른 폰에서 ${national} 로 직접 전화 → Effiroad가 받으면 성공.`,
    ];
  }

  if (provider === "google_voice") {
    return [
      "PC 브라우저에서 https://voice.google.com/settings 로그인 (샵 Google Voice 계정).",
      "Calls 탭에서 먼저 끄기: Screen calls(추가 안내), “Show my Google Voice number as caller ID when forwarding”, My Devices 동시 울림.",
      `Linked numbers → Add linked number → ${e164} (+1 포함) 입력 → 인증 코드 요청.`,
      "인증은 **전화**로 받으세요(문자 아님). Effiroad가 Google 인증 전화를 받는지 아래 테스트 단계에서 확인합니다.",
      "Calls → Linked numbers에서 Effiroad로 전환 ON. 목적지는 Effiroad 하나만.",
      "중요: Google Voice만으로 ‘내 폰 먼저 ~20초 → Effiroad’ overflow는 거의 안 됩니다. 안정적이려면 AT&T/T-Mobile/Verizon **61*/*71 또는 Effiroad 전용번호를 쓰세요.",
      "테스트: Google Voice 샵 번호로 전화. GV 경로가 불안정하면 위 통신사 경로로 바꾸세요.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "경로 A — ServiceTitan Phones Pro / Dialpad Main Line (가장 흔함):",
      "1) https://dialpad.com/officesettings → Admin Settings → Main Line 선택.",
      "2) Business Hours & Call Routing → Edit Call Routing.",
      "3) Fallback Options(또는 Other routing) → “To a team member, room phone, or external number”.",
      `4) ${e164} 입력 → Enter → 화면에 “Changes saved” 확인.`,
      "5) Closed Hours Routing에도 **같은** Effiroad 번호를 넣으세요.",
      "6) Main Line에 Fallback 메뉴가 없으면: Contact Center → 기본 센터 → 동일 단계.",
      "경로 B — Jobber Phone / 개인 회선:",
      "1) https://dialpad.com/app → Settings → Users → 샵 회선 → When unanswered → Forward to external.",
      `2) ${e164} 저장. Jobber: Settings → Phone → 미응답 → 외부 번호.`,
      "공통: **Always forward(전체 착신) 금지** — No answer / Fallback만. 발신자 번호 전달(Caller ID pass-through) 켜기.",
      "테스트: **고객이 거는 샵 메인 번호**로 전화 → 받지 않고 ~20초 울리게 → Effiroad가 받으면 성공.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    const alt = `**61*1${tenDigit}#`;
    return [
      "고객 전화를 **실제로 받는 AT&T 샵 휴대폰**을 준비하세요 (Cricket·Straight Talk 포함). 다른 기기에서는 코드가 안 먹힐 수 있습니다.",
      `아래 [코드 통화] 버튼을 탭하거나, 키패드에 ${code} 입력 후 **통화**를 누르세요.`,
      "**절대 *21* 사용 금지** — 모든 전화가 즉시 넘어갑니다. **61* / *61* 조건부 코드만** 씁니다.",
      "AT&T 확인음·짧은 안내·문자(SMS)를 기다리세요. 실패하면 아래 대체 코드를 시도합니다.",
      `대체 코드: ${alt} (20초 타이머 없음)`,
      "해제: ##61# (다시 켜려면 코드 재실행)",
      "코드가 계속 실패: AT&T (800) 331-0500 — “conditional call forwarding / no-answer forwarding” 개통 요청.",
      FORWARDING_IPHONE_WARNING,
      "테스트: 다른 폰에서 **샵 메인 번호**로 전화 → **받지 않고 ~20초** 울리게 → Effiroad가 받으면 성공.",
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}**20#`;
    const alt = `**61*1${tenDigit}#`;
    return [
      "고객 전화를 **실제로 받는 T-Mobile 샵 휴대폰**을 준비하세요 (Metro·Mint 포함).",
      `아래 [코드 통화] 버튼을 탭하거나, 키패드에 ${code} 입력 후 **통화**를 누르세요.`,
      "**절대 **21* 사용 금지** — 전체 착신입니다. 미응답 조건부(**61*)만 사용.",
      "T-Mobile 확인음·문자를 기다리세요. 실패하면 대체 코드를 시도합니다.",
      `대체 코드: ${alt}`,
      "선불 요금제는 코드가 막힐 수 있습니다 → T-Mobile 611에 “conditional forwarding” 개통 요청.",
      "해제: ##61# 또는 ##004#",
      FORWARDING_IPHONE_WARNING,
      "테스트: 다른 폰에서 **샵 메인 번호**로 전화 → **받지 않고 ~20초** 울리게 → Effiroad가 받으면 성공.",
    ];
  }

  if (provider === "xfinity") {
    return [
      "고객 전화를 **실제로 받는 Xfinity Mobile 샵 휴대폰**만 사용하세요. 웹·다른 기기에서는 *71 활성화가 안 됩니다.",
      `키패드에 *71${tenDigit} 입력 → **통화** 버튼. (아래 [코드 통화] 버튼 사용 가능)`,
      "**절대 *72 금지** — 모든 전화가 즉시 넘어갑니다.",
      "Xfinity 확인음·안내를 기다린 뒤 테스트하세요.",
      "해제: *73",
      "테스트: 다른 폰에서 **샵 메인 번호**로 전화 → 받지 않고 울리게 → Effiroad가 받으면 성공.",
      "계속 실패하면 Effiroad 전용번호(착신 코드 없음)로 전환하세요.",
    ];
  }

  if (provider === "ringcentral") {
    return [
      "RingCentral Admin Portal 로그인 → Phone System → 샵 회선(메인 번호) 선택.",
      "Call Handling / Call Forwarding → **순차 울림(Sequential)** 5~8초 후 external number.",
      `미응답 시 external에 ${e164} 입력. **Simultaneous(동시 울림) 금지.**`,
      "Caller ID pass-through(발신자 번호 전달) 켜기.",
      "테스트: RingCentral 샵 번호로 전화 → 받지 않고 → Effiroad가 받으면 성공.",
    ];
  }

  if (provider === "grasshopper") {
    return [
      "grasshopper.com 로그인 → Extensions → 메인 내선 선택.",
      `Forwarding numbers → Add → ${e164} → **Direct connect** (press-1 스크리닝 끄기).`,
      "Caller ID / pass-through 켜기.",
      "테스트: Grasshopper 샵 번호로 전화 → Effiroad가 받으면 성공.",
    ];
  }

  return [
    "고객 전화를 **실제로 받는 Verizon 샵 휴대폰**을 준비하세요.",
    `방법 A (권장): 아래 [*71 코드 통화] 버튼 탭 — 또는 키패드에 *71${tenDigit} 입력 후 **통화**.`,
    "**절대 *72 금지** — 모든 전화가 즉시 넘어갑니다.",
    "Verizon 확인음·안내를 기다리세요. 해제: *73",
    `방법 B: m.vzw.com/callforwarding → **When unanswered / No answer only** → ${e164} 저장.`,
    "방법 C: My Verizon 앱 → Account → Call Forwarding → 미응답 시만.",
    FORWARDING_IPHONE_WARNING,
    "iPhone **Live Voicemail(실시간 음성 사서함)** 끄기: 설정 → 앱 → 전화.",
    "테스트: 다른 폰에서 **샵 메인 번호**로 전화 → **받지 않고 20~25초** 울리게 → Effiroad가 받으면 성공.",
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
