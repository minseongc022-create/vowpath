import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const policy = readFileSync(join(root, "lib/booking-policy.ts"), "utf8");
const portal = readFileSync(join(root, "components/intake/CustomerBookingPortal.tsx"), "utf8");
const queue = readFileSync(join(root, "components/dashboard/PendingReviewQueue.tsx"), "utf8");
const calendar = readFileSync(join(root, "components/intake/LinkIntakeSlotCalendar.tsx"), "utf8");
const sms = readFileSync(join(root, "lib/sms-templates.ts"), "utf8");
const track = readFileSync(join(root, "components/tracking/CustomerTrackView.tsx"), "utf8");
const form = readFileSync(join(root, "components/intake/LinkIntakeForm.tsx"), "utf8");
const crew = readFileSync(join(root, "components/dashboard/CrewAssignPanel.tsx"), "utf8");

test("owner status labels exist separately from customer labels", () => {
  assert.match(policy, /OWNER_REQUEST_STATUS_LABELS/);
  assert.match(policy, /Needs your review/);
  assert.match(policy, /Approved — we'll see you soon!/);
  assert.match(policy, /return normalizeRequestStatus\(status\) === "approved"/);
});

test("portal slots load with retry + cancel uses readJsonResponse", () => {
  assert.match(portal, /slotsLoading/);
  assert.match(portal, /Couldn't load open windows/);
  assert.match(portal, /readJsonResponse\(res\)/);
  assert.match(calendar, /Keep the visible day in sync/);
});

test("pending queue surfaces approve errors and SMS ref commands", () => {
  assert.match(queue, /Couldn't approve/);
  assert.match(queue, /SMS: 1 \{ref\}/);
  assert.match(queue, /OWNER_REQUEST_STATUS_LABELS/);
});

test("SMS copy softens pick-time and live map link", () => {
  assert.match(sms, /Pick visit time:/);
  assert.match(sms, /Live map:/);
  assert.match(sms, /buildSmsWithLink/);
});

test("tracking page has terminal expired state", () => {
  assert.match(track, /Tracking ended or this link expired/);
  assert.match(track, /Map appears once the technician shares GPS/);
});

test("link intake form handles empty slots and consent hint", () => {
  assert.match(form, /Check the required text-updates box above/);
  assert.match(form, /disabled=\{loading \|\| !selectedSlotId\}/);
});

test("crew panel shows setup empty state", () => {
  assert.match(crew, /No crew members set up yet/);
  assert.match(crew, /Add crew in Settings/);
});
