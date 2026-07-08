import type { ForwardingProviderId } from "./forwarding-guides-ko";

export type ForwardingUnblockGuide = {
  id: string;
  problem: string;
  steps: string[];
};

const VERIZON_SUPPORT = "800-922-0204";
const ATT_SUPPORT = "AT&T 휴대폰에서 611";
const TMO_SUPPORT = "T-Mobile 휴대폰에서 611";

export function getForwardingUnblockGuides(
  provider: ForwardingProviderId,
  tenDigitEffiroad: string,
): ForwardingUnblockGuide[] {
  const td = tenDigitEffiroad.replace(/\D/g, "").slice(-10);

  if (provider === "effiroad_main") {
    return [
      {
        id: "main-gbp-delay",
        problem: "구글에 아직 옛 번호가 보임",
        steps: [
          "구글 비즈니스 프로필 반영에 24~48시간 걸릴 수 있습니다.",
          "연락처 → 전화에 Effiroad 번호가 저장됐는지 확인.",
          "Effiroad 번호로 직접 전화 테스트는 즉시 가능합니다.",
        ],
      },
    ];
  }

  if (provider === "google_voice") {
    return [
      {
        id: "gv-verify-fail",
        problem: "Google Voice가 Effiroad 번호 인증 실패",
        steps: [
          "테스트 단계에서 Effiroad가 인증 전화를 받는지 확인.",
          "안 되면 Effiroad 메인 번호 또는 휴대폰 **61*/*71 사용.",
        ],
      },
    ];
  }

  if (provider === "verizon") {
    const star71 = `*71${td}`;
    return [
      {
        id: "vz-no-app-menu",
        problem: "My Verizon 앱에 Call forwarding 메뉴가 없음",
        steps: [
          `샵 휴대폰에서 ${star71} 입력 후 통화 (Verizon 공식 조건부 코드).`,
          "확인 톤 후 다른 폰으로 테스트.",
          `안 되면 *73으로 해제 후 ${star71} 재시도.`,
          `선불: 앱 불가인 경우 많음 — ${star71}만 사용.`,
          `Verizon ${VERIZON_SUPPORT} — "조건부 착신전환(미응답) 활성화" 요청.`,
        ],
      },
      {
        id: "vz-prepaid",
        problem: "선불 / Visible / Total Wireless",
        steps: [
          `선불 폰에서 ${star71} — My Verizon 사용 금지.`,
          "빠른 통화중 신호: Verizon에 착신전환 기능 개통 요청.",
          "재시도 전 *73으로 해제.",
        ],
      },
      {
        id: "vz-business",
        problem: "법인폰 — 옵션 비활성",
        steps: [
          "회사 Verizon 관리자에게 회선 착신전환 허용 요청.",
          `관리자: Verizon Business에서 미응답 시 +1${td} 설정.`,
          `허용되면 직원폰에서 ${star71} 시도.`,
        ],
      },
      {
        id: "vz-voicemail-first",
        problem: "음성사서함이 Effiroad보다 먼저 받음",
        steps: [
          "iPhone: 설정 → 전화 → Live Voicemail 끄기.",
          "iPhone: 설정 → 전화 → 착신전환 — 반드시 끄기.",
          `${star71} 또는 My Verizon 미응답 설정 재적용.`,
          "25초 이상 울리게 테스트.",
        ],
      },
    ];
  }

  if (provider === "att") {
    const code = `**61*1${td}*11*20#`;
    const alt = `**61*1${td}#`;
    return [
      {
        id: "att-code-fails",
        problem: "코드 오류 톤 / 통화중 신호",
        steps: [
          `짧은 코드 시도: ${alt}`,
          `초기화: ##61# 후 ${code} 재시도.`,
          `${ATT_SUPPORT} — "conditional call forwarding" 활성화 요청.`,
        ],
      },
      {
        id: "att-prepaid-cricket",
        problem: "Cricket / AT&T 선불",
        steps: [
          `Cricket 폰에서 ${code}`,
          "코드 실패 시 Cricket 설정 → Call forwarding 메뉴 확인.",
        ],
      },
      {
        id: "att-voicemail",
        problem: "음성사서함이 먼저 받음",
        steps: [
          "iPhone Live Voicemail 끄기.",
          `##61# 후 ${code} 재적용.`,
        ],
      },
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${td}#`;
    return [
      {
        id: "tm-code-fails",
        problem: "코드 실패 / 확인 문자 없음",
        steps: [
          `##004# 초기화 후 ${code} 재시도.`,
          `${TMO_SUPPORT} — 조건부 착신전환 개통 요청.`,
        ],
      },
      {
        id: "tm-mvno",
        problem: "Metro / Mint / Ultra",
        steps: [
          `동일 코드 ${code} (T-Mobile 망).`,
          "Wi-Fi 통화만 쓰는 경우: Wi-Fi 통화 끄고 셀룰러에서 재시도.",
        ],
      },
    ];
  }

  return [
    {
      id: "dp-wrong-line",
      problem: "저장했는데 테스트 실패",
      steps: [
        "고객이 거는 메인 번호를 맞게 수정했는지 확인.",
        "미응답 시만 — 무조건 착신 아님.",
        "+1 포함 전체 번호 붙여넣기.",
      ],
    },
    {
      id: "dp-jobber",
      problem: "Jobber Phone에서 설정 못 찾음",
      steps: [
        "Jobber → Settings → Phone → 미응답 시 외부 번호.",
        "권한 없으면 관리자에게 Effiroad 번호 전달.",
      ],
    },
  ];
}

export const FORWARDING_CARRIER_PHONES = {
  verizon: VERIZON_SUPPORT,
  att: ATT_SUPPORT,
  tmobile: TMO_SUPPORT,
} as const;
