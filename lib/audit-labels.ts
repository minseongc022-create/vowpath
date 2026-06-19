import type { TenantEventType } from "./tenant-events";

import { isEnglishUi } from "./locale";



const LABELS_EN: Record<TenantEventType, string> = {

  service_request_created: "Request received",

  service_request_approved: "Approved",

  service_request_rejected: "Declined",

  service_request_scheduled: "Scheduled",

  service_request_completed: "Completed",

  customer_corrected: "Customer corrected",

  customer_verified: "Customer verified",

  booking_jobber_synced: "Jobber synced",

  emergency_call: "Emergency call",

  callback_requested: "Callback requested",

  voicemail_received: "Voicemail",

  jobber_sync_failed: "Jobber sync failed",

  call_intake_failed: "Intake failed",

  sms_delivery_failed: "SMS delivery failed",

  security: "Security",

  workflow_rule_matched: "Automation rule applied",

};



const LABELS_KO: Record<TenantEventType, string> = {

  service_request_created: "요청 접수",

  service_request_approved: "승인됨",

  service_request_rejected: "거절됨",

  service_request_scheduled: "일정 확정",

  service_request_completed: "완료",

  customer_corrected: "고객 수정",

  customer_verified: "고객 확인",

  booking_jobber_synced: "Jobber 동기화",

  emergency_call: "긴급 콜",

  callback_requested: "콜백 요청",

  voicemail_received: "음성메일",

  jobber_sync_failed: "Jobber 동기화 실패",

  call_intake_failed: "Intake 실패",

  sms_delivery_failed: "문자 전송 실패",

  security: "보안",

  workflow_rule_matched: "운영 규칙 적용",

};



const LABELS = isEnglishUi() ? LABELS_EN : LABELS_KO;



export function formatAuditEventType(type: TenantEventType): string {

  return LABELS[type] ?? type;

}

