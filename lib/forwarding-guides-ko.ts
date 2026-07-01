/** Call-forwarding setup guides — Korean (legacy). */



export type ForwardingScenarioId = "overflow" | "busy_and_after_hours";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours";

export type ForwardingProviderId = "carrier" | "dialpad" | "voip" | "other";



export type ForwardingScenario = {

  id: ForwardingScenarioId;

  label: string;

  summary: string;

  recommended?: boolean;

};



export type ForwardingProvider = {

  id: ForwardingProviderId;

  label: string;

  hint: string;

  recommended?: boolean;

};



export function normalizeForwardingScenario(

  scenario?: LegacyForwardingScenarioId | string,

): ForwardingScenarioId {

  if (scenario === "busy_and_after_hours") return "busy_and_after_hours";

  return "overflow";

}



export const FORWARDING_PROVIDER_NOTE =

  "통신사·전화 업체마다 메뉴 이름이 조금씩 다릅니다. 아래는 시작 가이드이며, 변경 전 공식 문서를 한 번 더 확인하세요.";



export const FORWARDING_SCENARIOS: ForwardingScenario[] = [

  {

    id: "overflow",

    label: "받지 못했을 때 (가장 흔함)",

    summary:

      "메인 번호가 먼저 울립니다. 약 15~20초 안에 받지 않으면 Effiroad로 넘어갑니다.",

    recommended: true,

  },

  {

    id: "busy_and_after_hours",

    label: "통화 중",

    summary:

      "다른 통화 중일 때 Effiroad로 넘깁니다. 야간·주말은 응대 시간 설정에서 따로 정합니다.",

  },

];



export const FORWARDING_PROVIDERS: ForwardingProvider[] = [

  {

    id: "dialpad",

    label: "Jobber Phone / Dialpad",

    hint: "ServiceTitan Phones Pro 등 Dialpad 기반도 동일",

    recommended: true,

  },

  {

    id: "carrier",

    label: "휴대폰 통신사",

    hint: "Verizon, AT&T, T-Mobile — 단축번호는 업체마다 다름",

  },

  {

    id: "voip",

    label: "업무용 VoIP",

    hint: "RingCentral, OpenPhone, 3CX 등",

  },

  {

    id: "other",

    label: "기타",

    hint: "PBX, 호스팅 음성, 맞춤 시스템",

  },

];



export const FORWARDING_TROUBLESHOOTING: Record<ForwardingProviderId, string[]> = {

  dialpad: [

    "설정한 통화 대기 시간이 실제로 적용되는지 확인하세요 — 다른 메뉴의 더 짧은 타임아웃이 먼저 작동해 착신전환이 일찍 걸릴 수 있습니다.",

    "Settings → Phone Numbers → [번호] → Call Handling에서 방금 설정한 규칙을 덮어쓰는 다른 규칙이 있는지 확인하세요.",

    "Jobber Phone 사용자는 Dialpad뿐 아니라 Jobber 자체의 Call Routing 메뉴도 확인하세요 — 중복되거나 충돌하는 규칙이 가장 흔한 원인입니다.",

  ],

  carrier: [

    "아이폰 기본 착신전환 토글이 아닌 통신사 전용 스타 코드를 사용했는지 확인하세요 — 기본 토글은 모든 전화를 무조건 전환시켜 무응답 규칙을 무력화할 수 있습니다.",

    "새 코드를 입력하기 전에 해지 코드(##61#)를 먼저 입력하세요. 이전 규칙이 남아 있으면 새 설정이 적용되지 않습니다.",

    "일부 요금제는 스타 코드 사용 전 통신사 측에서 착신전환 기능을 별도로 활성화해야 합니다 — 오류음이 들리면 통신사 고객센터에 문의하세요.",

  ],

  voip: [

    "규칙이 올바른 내선/사용자에 연결되어 있는지 확인하세요 — 사용자별 설정과 큐(queue)별 설정은 서로 영향을 주지 않는 경우가 많습니다.",

    "다이얼 플랜에 따라 외부 번호 앞에 트렁크 접두번호(예: 9 + 번호)가 필요한지 확인하세요.",

    "무응답 규칙에 도달하기 전에 통화를 가로채는 Time Condition이나 IVR 단계가 있는지 확인하세요.",

  ],

  other: [

    "착신전환이 올바른 트렁크/라인에 설정되어 있는지, 사용하지 않는 보조 라인이 아닌지 확인하세요.",

    "착신전환 규칙과 별도로 \"follow-me\" 또는 외부 전환 권한을 활성화해야 하는 시스템인지 확인하세요.",

  ],

};



export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE: Record<ForwardingProviderId, string> = {

  dialpad: "그래도 안 되면 휴대폰 통신사의 기본 착신전환 기능을 대신 사용해 보세요.",

  carrier: "앱 기반 착신전환을 원하면 Dialpad로 전환하는 것도 방법입니다.",

  voip: "가장 간단한 설정을 원하면 Dialpad를 추천합니다.",

  other: "계속 안 되면 Dialpad가 가장 안정적인 선택지입니다.",

};



export const FORWARDING_TROUBLESHOOTING_FALLBACK =

  "다른 공급사로도 해결되지 않나요? Dialpad(Jobber Phone 경유)가 가장 안정적으로 검증된 방식입니다. Effiroad 고객지원에 문의하시면 전환을 도와드립니다.";



export function getForwardingGuideSteps(

  provider: ForwardingProviderId,

  scenario: LegacyForwardingScenarioId,

  effiroadNumber: string,

): string[] {

  const activeScenario = normalizeForwardingScenario(scenario);

  const num = effiroadNumber || "(Effiroad 번호)";

  const dialNum = num.replace(/\D/g, "").slice(-10);

  const tenDigit = dialNum || "10자리 번호";



  if (provider === "dialpad") {

    if (activeScenario === "overflow") {

      return [

        "dialpad.com → 설정(⚙) → Phone Numbers → 메인 번호 클릭 → Edit.",

        "Call Handling → When Unanswered 항목에서 Forward to external number를 켜세요.",

        `외부 번호에 ${num}를 입력하고 링 타임아웃을 20초로 설정 → Save.`,

        "Jobber Phone 사용자: Jobber → Settings → Phone → Call Routing — 동일한 항목 있음.",

        "다른 폰으로 샵 번호를 눌러 20초 지나도록 두고 Effiroad가 받는지 확인하세요.",

      ];

    }

    return [

      "dialpad.com → 설정(⚙) → Phone Numbers → 메인 번호 → Edit.",

      "When Unanswered와 When Busy 두 항목 모두 Forward to external number로 설정.",

      `두 규칙의 외부 번호에 ${num} 입력 → Save.`,

      "낮 시간 부재, 통화 중, 야간 세 가지를 각각 테스트하세요.",

    ];

  }



  if (provider === "carrier") {

    if (activeScenario === "overflow") {

      return [

        `Verizon — 전화 앱에서 *71${tenDigit} 입력 후 통화 버튼. 해제: *73 → 통화. Verizon iPhone은 설정 → 전화 → Live Voicemail → 끔 먼저.`,

        `AT&T — **61*+1${tenDigit}*11*20# 입력 후 통화 버튼 (20 = 벨 울림 초). 해제: ##61# → 통화.`,

        `T-Mobile — **61*+1${tenDigit}# 입력 후 통화 버튼. 해제: ##61# → 통화.`,

        "iPhone 기본 착신전환(설정 → 전화 → 착신전환)은 모든 통화를 넘기므로, 위 단축번호를 사용하는 것이 낫습니다.",

        "설정 후 다른 폰으로 샵 번호로 전화해 Effiroad가 받는지 확인하세요.",

      ];

    }

    return [

      `Verizon 부재/통화중: *71${tenDigit} → 통화. 해제: *73 → 통화.`,

      `AT&T 부재: **61*+1${tenDigit}*11*20# → 통화. 해제: ##61# → 통화.`,

      `T-Mobile 부재: **61*+1${tenDigit}# → 통화. 해제: ##61# → 통화.`,

      "야간 응대 시간은 연동 설정의 응대 시간에서 설정한 뒤, 해당 시간에 테스트하세요.",

    ];

  }



  if (provider === "voip") {

    if (activeScenario === "overflow") {

      return [

        "RingCentral: Admin Portal → Phone System → Users → [사용자] → Call Handling & Forwarding → 규칙 추가 → Forward to external number.",

        "OpenPhone: Settings → Phone numbers → 번호 클릭 → Call routing → When unanswered → Forward to external.",

        `외부 번호에 ${num} 입력, 링 타임을 20초로 설정.`,

        "3CX·기타: Inbound Rules 또는 Time Conditions에서 부재 시 외부 번호로 전환 규칙을 추가하세요.",

      ];

    }

    return [

      "RingCentral / OpenPhone: 부재 규칙과 통화 중 규칙 두 개를 같은 외부 번호로 설정.",

      `두 규칙의 목적지: ${num}.`,

      "3CX·기타: Call Queue 또는 Ring Group의 Overflow 설정에서 외부 번호를 지정하세요.",

      "각 시나리오(부재·통화중·야간)를 공개 번호로 직접 테스트하세요.",

    ];

  }



  return [

    "전화 시스템 관리 패널에서 착신전환 또는 외부 번호 라우팅 항목을 찾으세요.",

    `전환 대상을 ${num}로 지정합니다.`,

    activeScenario === "busy_and_after_hours"

      ? "부재·통화중 두 조건 모두 전환을 켜세요."

      : "부재 시 전환을 켜세요.",

    "야간·주말 응대는 연동 설정의 응대 시간에서 설정합니다.",

    "고객이 실제로 거는 번호로 테스트해 Effiroad가 받는지 확인하세요.",

  ];

}

