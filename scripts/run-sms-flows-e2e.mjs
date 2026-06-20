/**
 * SMS template smoke — triggers each notification path in dev (SMS_DEV_PREVIEW logs bodies).
 * Usage: node scripts/run-sms-flows-e2e.mjs [port]
 */
import { ensureDevUser, apiFetch } from "./lib/e2e-session.mjs";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;
const user = ensureDevUser();

const FLOWS = [
  "customer_intake_ack",
  "customer_scheduled",
  "customer_no_slot",
  "customer_approved",
  "customer_rejected",
  "owner_scheduled_fyi",
  "owner_approval_needed",
  "owner_urgent_auto_booked",
  "owner_no_slot",
  "owner_shadow",
  "customer_booking_confirmation",
  "owner_new_request",
  "link_intake",
  "customer_verification",
  "signup_verification",
  "tech_dispatch_offer",
];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

console.log(`Testing ${FLOWS.length} SMS flows against ${base}…`);

const res = await apiFetch(base, "/api/dev/sms-smoke", user, {
  method: "POST",
  body: JSON.stringify({ flows: FLOWS }),
});

if (!res.res.ok) fail(`sms-smoke failed: ${JSON.stringify(res.json)}`);

const results = res.json.results ?? [];
let passed = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`✓ ${r.flow}${r.preview ? " (preview)" : ""}`);
    passed++;
  } else {
    console.error(`✗ ${r.flow}: ${r.error ?? "failed"}`);
  }
}

if (passed !== FLOWS.length) {
  fail(`${passed}/${FLOWS.length} SMS flows passed`);
}

console.log(`\n✅ All ${FLOWS.length} SMS flows OK`);
