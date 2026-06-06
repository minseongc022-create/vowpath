import type { TenantEventType } from "./tenant-events";

const LABELS: Record<TenantEventType, string> = {
  service_request_created: "요청 접수",
  service_request_approved: "승인됨",
  service_request_rejected: "거절됨",
  service_request_scheduled: "일정 확정",
  service_request_completed: "완료",
  emergency_call: "긴급 콜",
  callback_requested: "콜백 요청",
  voicemail_received: "음성메일",
  jobber_sync_failed: "Jobber 동기화 실패",
  call_intake_failed: "Intake 실패",
  sms_delivery_failed: "문자 전송 실패",
};

export function formatAuditEventType(type: TenantEventType): string {
  return LABELS[type] ?? type;
}
