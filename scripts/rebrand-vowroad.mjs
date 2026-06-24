/**
 * User-facing Vowpath → Vowroad rebrand (display copy only).
 * Does not rename APIs, KV keys, or TypeScript identifiers.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "lib/constants.ts",
  "lib/content.ts",
  "lib/content-marketing-en.ts",
  "lib/content-ui-en.ts",
  "lib/content-dashboard-en.ts",
  "lib/content-settings-en-backup.ts",
  "lib/forwarding-guides-en.ts",
  "lib/forwarding-guides-ko.ts",
  "lib/operating-flow-en.ts",
  "lib/operating-flow-ko.ts",
  "lib/field-test-guide.ts",
  "lib/integration-status.ts",
  "lib/jobber-api.ts",
  "lib/scheduling/schedule-sms.ts",
  "lib/tech-dispatch/assign.ts",
  "lib/ai-admin/answer.ts",
  "lib/ai-admin/analyze.ts",
  "lib/send-email.ts",
  "lib/customer-sms.ts",
  "lib/twilio-provision.ts",
  "lib/after-hours.ts",
  "lib/answer-schedule.ts",
  "lib/recovery-roi.ts",
  "lib/brand-assets.ts",
  "app/api/messaging/status/route.ts",
  "components/brand/BrandHeroVisual.tsx",
  "components/brand/HeroFlowVisual.tsx",
  "components/dashboard/CollectedRevenuePanel.tsx",
  "components/dashboard/RecoveryMetricsPanel.tsx",
  "components/dashboard/DashboardShell.tsx",
  "components/dashboard/VowroadAiView.tsx",
  "components/dashboard/BookingTimelinePanel.tsx",
  "components/settings/CompanyAiMemorySettings.tsx",
  "components/settings/AutomationRulesView.tsx",
];

const pairs = [
  ["VOWPATH", "VOWROAD"],
  ["Vowpath", "Vowroad"],
  ['id: "vowpath"', 'id: "vowroad"'],
  ['"vowpath", "owner"', '"vowroad", "owner"'],
  ['node.id === "vowroad"', 'node.id === "vowroad"'],
  ["project(vowpath)", "project(vowroad)"],
];

let touched = 0;
for (const rel of files) {
  const file = path.join(root, rel);
  let content = readFileSync(file, "utf8");
  const before = content;
  for (const [from, to] of pairs) {
    content = content.split(from).join(to);
  }
  if (content !== before) {
    writeFileSync(file, content);
    touched += 1;
    console.log("updated", rel);
  }
}
console.log(`done: ${touched} files`);
