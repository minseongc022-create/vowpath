/** Marketing copy — shop-facing operating flow (matches product). */

export type OperatingFlowPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  outputs: string[];
  details: { label: string; text: string }[];
};

export const OPERATING_FLOW_PHASES: OperatingFlowPhase[] = [
  {
    id: "forwarding",
    phase: "1단계",
    title: "메인 번호 + 착신전환",
    summary:
      "고객에게 보이는 번호는 지금 쓰는 업체 번호 그대로입니다. 못 받을 때·야간·주말에만 Vowpath로 착신전환합니다.",
    outputs: ["번호 1개 유지", "조건부 전환", "시간대 설정"],
    details: [
      {
        label: "고객 번호",
        text: "홈페이지·구글·명함에는 평소 업체 번호만 그대로 둡니다.",
      },
      {
        label: "조건부 전환",
        text: "안 받으면 / 통화중 / 몇 초 후 → Vowpath 번호로 넘깁니다.",
      },
      {
        label: "야간·주말",
        text: "통신사 스케줄 착신전환 또는 VoIP·Jobber Phone 시간 규칙으로 설정합니다.",
      },
    ],
  },
  {
    id: "intake",
    phase: "2단계",
    title: "전화 or 링크 접수",
    summary:
      "Vowpath로 넘어온 전화에서 AI가 전화 접수와 링크 접수 중 선택을 안내합니다. 연락처·주소·증상을 받아 요약합니다.",
    outputs: ["전화 접수", "링크 접수", "요약 정리"],
    details: [
      {
        label: "접수 방식",
        text: "전화로 말하거나, 문자로 받은 링크 폼에 입력합니다.",
      },
      {
        label: "받는 정보",
        text: "이름·연락처·주소·문제 상황 등 예약에 필요한 내용입니다.",
      },
      {
        label: "업체용 요약",
        text: "통화·폼 내용을 한눈에 볼 수 있게 정리해 둡니다.",
      },
    ],
  },
  {
    id: "review",
    phase: "3단계",
    title: "문자·이메일로 승인",
    summary:
      "접수가 들어오면 업체 휴대폰으로 요약 문자가 옵니다. 같은 내용이 이메일로도 와서 한 번 더 확인할 수 있습니다.",
    outputs: ["SMS 알림", "이메일 확인", "1·2 답장"],
    details: [
      {
        label: "문자 (메인)",
        text: "새 접수 요약이 옵니다. 1=승인, 2=거절만 답하면 됩니다.",
      },
      {
        label: "이메일 (보조)",
        text: "같은 내용이 이메일로도 갑니다. 책상·PC에서 다시 보기용입니다.",
      },
      {
        label: "고객 안내",
        text: "1번 승인 시 고객 번호로 바로 확정 문자가 발송됩니다.",
      },
    ],
  },
  {
    id: "jobber",
    phase: "4단계",
    title: "Jobber 자동 기록",
    summary:
      "승인된 접수만 Jobber에 자동으로 등록됩니다. Jobber를 쓰지 않아도 문자·대시보드만으로 운영할 수 있습니다.",
    outputs: ["승인 후 반영", "선택 연동", "대시보드"],
    details: [
      {
        label: "자동 등록",
        text: "업체가 1번으로 승인하면 Jobber에 Request가 자동으로 들어갑니다.",
      },
      {
        label: "선택 사항",
        text: "이미 Jobber를 쓰는 업체만 연동하면 됩니다.",
      },
      {
        label: "대시보드",
        text: "문자 없이 웹에서도 접수·승인 이력을 볼 수 있습니다.",
      },
    ],
  },
];

/** Landing hero — approval loop (top diagram only; phase cards unchanged). */
export const HERO_FLOW_TAGS = [
  "전화 · 링크 접수",
  "업체에 승인 요청 문자",
  "1=승인 · 2=거절",
  "고객 자동 안내",
] as const;

export const HERO_FLOW_PIPELINE = [
  { step: "01", title: "고객 접수", subtitle: "전화 또는 링크", icon: "intake" as const },
  { step: "02", title: "승인 요청", subtitle: "업체 SMS 발송", icon: "sms" as const },
  { step: "03", title: "업체 결정", subtitle: "1=승인 · 2=거절", icon: "review" as const },
  { step: "04", title: "고객 안내", subtitle: "확정·거절 자동 문자", icon: "notify" as const },
] as const;

export const HERO_FLOW_LOOP_SUMMARY =
  "고객이 전화·링크로 접수하면 Vowpath가 업체에 승인 요청 문자를 보냅니다. 업체가 1(승인) 또는 2(거절)로 답하면 고객에게 결과 문자가 자동으로 갑니다.";

export const OPERATING_FLOW_NODES = [
  { id: "customer", title: "고객 접수", caption: "전화·링크로 정보 전달" },
  { id: "vowpath", title: "Vowpath AI", caption: "요약 · 승인 요청 생성" },
  { id: "owner", title: "업체 결정", caption: "1=승인 · 2=거절 답장" },
  { id: "customer-out", title: "고객 안내", caption: "확정·거절 문자 수신" },
] as const;

export const OPERATING_FLOW_EDGES = [
  "접수 내용을 정리",
  "업체 휴대폰으로 승인 요청 문자",
  "1=승인 · 2=거절 → 고객에게 자동 발송",
] as const;
