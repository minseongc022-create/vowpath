import { resolveShopDisplayName } from "./shop-display-name";

export function channelChoiceVoicePrompt(shopName: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `안녕하세요, ${shop}입니다. ` +
    `더 빠른 접수를 위해 문자 링크로 요청을 남기실 수 있습니다. ` +
    `문자 링크 접수를 원하시면 1번을 눌러주세요. ` +
    `전화로 접수하려면 그대로 말씀해주세요.`
  );
}

export function channelChoiceGatherHint(): string {
  return "1번은 문자 링크입니다. 전화 접수는 잠시만 기다려 주세요.";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop} 서비스 요청 링크\n\n` +
    `몇 가지 정보만 입력해주시면 담당자가 빠르게 확인해드리겠습니다.\n\n` +
    url
  );
}

export const linkIntakePageCopy = {
  formTitle: "서비스 요청 접수",
  formDescription:
    "몇 가지 정보만 입력해주시면 담당자가 빠르게 확인 후 연락드립니다.",
  nameLabel: "이름",
  namePlaceholder: "홍길동 / John Smith",
  addressLabel: "서비스 주소",
  addressPlaceholder: "서비스가 필요한 주소를 입력해주세요.",
  issueLabel: "무엇을 도와드릴까요?",
  issuePlaceholder:
    "에어컨이 시원하지 않습니다.\n온수기에서 물이 새고 있습니다.\n전기 차단기가 계속 내려갑니다.",
  photoLabel: "사진 첨부",
  photoOptional: "선택",
  photoHint: "문제 사진을 첨부하면 더 빠른 확인이 가능합니다.",
  photoButton: "사진 추가",
  photoChange: "사진 변경",
  urgencyLabel: "긴급도",
  slotStepTitle: "방문 시간 선택",
  slotStepDescription:
    "가능한 방문 시간대 중 하나를 선택해 주세요. (최대 5개)",
  slotStepBack: "이전",
  slotStepConfirm: "이 시간으로 접수",
  slotStepLoading: "가능한 시간 불러오는 중…",
  slotStepEmpty:
    "지금은 자동으로 제안할 시간이 없습니다. 요청만 접수하고 담당자가 연락드립니다.",
  slotStepSkip: "시간 없이 접수하기",
  submit: "다음 — 시간 선택",
  submitNoSlots: "요청 접수하기",
  submitting: "접수 중…",
  eta: "약 1분",
  successTitle: "요청이 정상적으로 접수되었습니다.",
  successBody:
    "아래 내용을 확인해 주세요. 잘못 입력하셨다면 하단의 수정하기를 눌러주세요.",
  requestNumberLabel: "요청번호",
  submissionTitle: "접수 내역",
  submissionSummaryTitle: "접수 내용",
  portalGateTitle: "접수 내역 확인",
  portalGateDescription:
    "접수할 때 입력한 이름과 전화번호를 입력하면 요청 내용을 확인·수정할 수 있습니다.",
  portalPhoneLabel: "전화번호",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "내역 보기",
  portalLooking: "조회 중…",
  portalLookupFailed: "입력하신 정보와 일치하는 접수 내역이 없습니다.",
  portalBackToLookup: "다시 조회",
  portalEditTitle: "요청 정보 수정",
  portalEdit: "수정하기",
  portalSave: "수정 완료",
  portalSaving: "저장 중…",
  portalUpdateSuccessBody:
    "수정된 내용이 업체에 전달되었습니다. 담당자가 확인 후 연락드릴 예정입니다.",
  portalSubmittedAt: "접수 일시",
  loadingSubmission: "접수 내역 불러오는 중…",
  loadSubmissionFailed: "접수 내역을 불러오지 못했습니다.",
  expiredTitle: "링크를 사용할 수 없습니다",
  expiredBody: "링크가 만료되었습니다. HVAC 업체에 다시 전화해 주세요.",
  correctionViewTitle: "접수 내역 확인",
  correctionViewHint:
    "아래 접수 내용을 확인해 주세요. 잘못된 부분이 있으면 하단의 수정하기를 눌러주세요.",
  correctionEditTitle: "요청 정보 수정",
  correctionDoneTitle: "수정이 완료되었습니다",
  correctionDoneBody:
    "수정된 내용이 업체에 문자로 전달되었습니다. 담당자가 확인 후 연락드릴 예정입니다.",
  correctionExpired: "링크가 만료되었거나 유효하지 않습니다.",
} as const;
