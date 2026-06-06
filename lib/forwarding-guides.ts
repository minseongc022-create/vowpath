/** Call-forwarding setup guides — 연동 설정(착신 전환) UI용 */

export type ForwardingScenarioId = "overflow" | "after_hours" | "busy_and_after_hours";

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

export const FORWARDING_PROVIDER_NOTE =
  "통신사·전화 업체마다 메뉴 이름이 조금씩 다릅니다. 아래는 시작 가이드이며, 변경 전 공식 문서를 한 번 더 확인하세요.";

export const FORWARDING_SCENARIOS: ForwardingScenario[] = [
  {
    id: "overflow",
    label: "받지 못했을 때 (가장 흔함)",
    summary:
      "메인 번호가 먼저 울립니다. 약 15~20초 안에 받지 않으면 Vowpath로 넘어갑니다.",
    recommended: true,
  },
  {
    id: "after_hours",
    label: "야간·주말",
    summary:
      "영업 시간에는 직접 받고, 밤과 주말에는 Vowpath가 바로 받습니다.",
  },
  {
    id: "busy_and_after_hours",
    label: "통화 중 + 야간",
    summary:
      "다른 통화 중이거나 문을 닫았을 때 Vowpath로 넘깁니다. 성수기에 유용합니다.",
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

export function getForwardingGuideSteps(
  provider: ForwardingProviderId,
  scenario: ForwardingScenarioId,
  vowpathNumber: string,
): string[] {
  const num = vowpathNumber || "(Vowpath 번호)";
  const ringTip =
    "직원이 받을 수 있도록 15~20초 정도 울리게 한 뒤 Vowpath로 넘기세요.";
  const dialNum = num.replace(/\D/g, "").slice(-10);
  const tenDigit = dialNum || "10자리 번호";

  if (provider === "dialpad") {
    if (scenario === "overflow") {
      return [
        "Dialpad 또는 Jobber Phone에서 메인 업무 번호의 착신 경로를 엽니다.",
        `부재/오버플로 규칙의 외부 번호를 ${num}로 지정합니다.`,
        "컨택센터 큐를 쓰면 큐의 오버플로 규칙에도 같은 외부 번호를 넣으세요.",
        `영업 시간에는 샵 번호가 먼저 울리고, 받지 못한 통화만 Vowpath로 갑니다. ${ringTip}`,
        "저장 후 영업 시간에 공개 샵 번호로 전화해 동작을 확인하세요.",
      ];
    }
    if (scenario === "after_hours") {
      return [
        "Dialpad 또는 Jobber Phone에서 메인 번호의 야간 라우팅을 엽니다.",
        `영업시간 외 목적지를 외부 번호 ${num}로 설정합니다.`,
        "Vowpath 연동 설정의 응대 시간·시간대와 맞춰 주세요.",
        "저장 후 문을 닫은 뒤 또는 주말에 테스트 통화를 해보세요.",
      ];
    }
    return [
      `영업 시간 — 부재/오버플로 → ${num}`,
      `영업시간 외 — 동일 번호: ${num}`,
      "컨택센터 경유 시 메인뿐 아니라 큐 규칙에도 동일하게 설정하세요.",
      "낮 부재, 야간, 통화 중 세 가지 상황을 각각 테스트하세요.",
    ];
  }

  if (provider === "carrier") {
    if (scenario === "after_hours") {
      return [
        "많은 샵이 야간에 *72로 전환, 아침에 *73으로 해제합니다 — 통신사 앱/사이트에서 먼저 확인하세요.",
        "My Verizon, myAT&T 등 앱에서 예약 전환을 지원하기도 합니다.",
        `전환 대상: ${num} (미국 10자리: ${tenDigit})`,
        "시간대별 규칙이 필요하면 개인 휴대폰보다 Dialpad·업무 VoIP가 보통 더 수월합니다.",
        "야간에 공개 샵 번호로 전화해 Vowpath가 받는지 확인하세요.",
      ];
    }
    if (scenario === "overflow") {
      return [
        "iPhone 기본 착신전환은 모든 통화를 넘깁니다(부재 전용 아님). 아래 단축번호가 보통 더 낫습니다.",
        `Verizon 예: 부재/통화중 *71${tenDigit}, 해제 *73 — Verizon 지원 페이지에서 최신 코드 확인.`,
        `AT&T 예: 부재 *92${tenDigit}#, 해제 *93# — 통화중 코드는 다를 수 있음.`,
        "Verizon iPhone은 설정 → 전화 → Live Voicemail을 끄고 *71을 테스트하세요.",
        "메인 샵 번호로 전화해 몇 번 울린 뒤 Vowpath가 받는지 확인하세요.",
      ];
    }
    return [
      `Verizon 스타일 부재/통화중: *71${tenDigit} (해제 *73). 야간은 *72/*73이 필요할 수 있음.`,
      `AT&T 스타일 부재: *92${tenDigit}# (해제 *93#). 통화중 코드는 통신사 페이지 참고.`,
      "Verizon iPhone은 Live Voicemail을 끈 뒤 테스트하세요.",
      "야간과 통화 중은 코드가 다를 수 있으니 각각 테스트하세요.",
    ];
  }

  if (provider === "voip") {
    if (scenario === "overflow") {
      return [
        "VoIP 관리 포털에서 메인 번호의 착신 경로·시간 규칙을 엽니다.",
        `부재 시 외부 번호 ${num}로 전환 규칙을 추가·수정합니다.`,
        `벨 울림 시간을 약 15~20초로 설정하세요. ${ringTip}`,
        "선택: 통화 중에도 같은 번호로 전환한 뒤 저장하고 테스트하세요.",
      ];
    }
    if (scenario === "after_hours") {
      return [
        "VoIP 포털에서 영업시간/야간 라우팅을 찾습니다.",
        `문을 닫았을 때 외부 번호 ${num}로 전환합니다.`,
        "Vowpath 연동 설정의 응대 시간·시간대와 맞춰 주세요.",
        "저장 후 야간에 테스트 통화를 하세요.",
      ];
    }
    return [
      "야간·통화 중 규칙을 각각 만들고 둘 다 외부 번호로 지정합니다.",
      `목적지: ${num}`,
      "성수기 대비 영업 시간 부재 규칙도 백업으로 두면 좋습니다.",
      "공개 샵 번호로 각 시나리오를 테스트하세요.",
    ];
  }

  return [
    "전화 시스템에서 착신 전환 또는 외부 번호 라우팅 메뉴를 찾습니다.",
    `전환 대상을 ${num}로 지정합니다.`,
    scenario === "after_hours"
      ? "가능하면 야간·주말에만 적용되도록 스케줄을 설정하세요."
      : "부재·통화 중 전환을 각각 켤 수 있으면 모두 설정하세요.",
    "고객이 실제로 거는 번호로 전화해 Vowpath가 받는지 확인하세요.",
  ];
}
