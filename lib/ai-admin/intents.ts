export type AiQueryIntent =
  | { kind: "customer"; name: string }
  | { kind: "calls_today" }
  | { kind: "pending_approvals" }
  | { kind: "urgent_requests" }
  | { kind: "bookings_week" }
  | { kind: "calendar_today" }
  | { kind: "calendar_week" }
  | { kind: "after_hours" }
  | { kind: "no_cooling"; lastWeek?: boolean }
  | { kind: "yesterday" }
  | { kind: "busiest_day" }
  | { kind: "urgent_calls" }
  | { kind: "call_memory" }
  | { kind: "policy" }
  | { kind: "settings_read" }
  | { kind: "integration_status" }
  | { kind: "automation_rules" }
  | { kind: "proactive" }
  | { kind: "chitchat" }
  | { kind: "general" };
