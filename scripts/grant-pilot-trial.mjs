/**
 * Grant a 30-day pilot trial to a tenant (by userId, email, or inbound phone).
 * Usage:
 *   node scripts/grant-pilot-trial.mjs --email you@example.com
 *   node scripts/grant-pilot-trial.mjs --user-id <uuid>
 *   node scripts/grant-pilot-trial.mjs --phone +12255291680
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const args = process.argv.slice(2);
function arg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1]?.trim() : undefined;
}

const email = arg("--email");
const userId = arg("--user-id");
const phone = arg("--phone");

if (!email && !userId && !phone) {
  console.error("Usage: node scripts/grant-pilot-trial.mjs --email <email>");
  console.error("   or: node scripts/grant-pilot-trial.mjs --user-id <uuid>");
  console.error("   or: node scripts/grant-pilot-trial.mjs --phone +1...");
  process.exit(1);
}

const kvUrl =
  process.env.KV_REST_API_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim();
const kvToken =
  process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

if (!kvUrl || !kvToken) {
  console.error("MISSING: KV_REST_API_URL and KV_REST_API_TOKEN in .env.local");
  process.exit(1);
}

async function redisCmd(command) {
  const res = await fetch(kvUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${kvToken}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis REST ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeE164(p) {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return p.startsWith("+") ? p : `+${digits}`;
}

const usersRaw = await redisCmd(["GET", "effiroad:users"]);
const store = usersRaw.result ? JSON.parse(usersRaw.result) : { users: [] };
let target = null;

if (userId) {
  target = store.users.find((u) => u.id === userId);
} else if (email) {
  const norm = email.toLowerCase();
  target = store.users.find((u) => u.email === norm);
} else if (phone) {
  const e164 = normalizeE164(phone);
  const mapRaw = await redisCmd(["GET", `effiroad:twilio-phone:${e164}`]);
  const mappedId = mapRaw.result;
  if (mappedId) {
    target = store.users.find((u) => u.id === mappedId);
  }
  if (!target) {
    target = store.users.find((u) => {
      const digits = (u.phone ?? "").replace(/\D/g, "");
      return digits && normalizeE164(digits) === e164;
    });
  }
}

if (!target) {
  console.error("USER_NOT_FOUND");
  process.exit(1);
}

const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
target.subscriptionStatus = "trialing";
target.trialEndsAt = trialEndsAt;

await redisCmd(["SET", "effiroad:users", JSON.stringify(store)]);

console.log(
  JSON.stringify(
    {
      ok: true,
      id: target.id,
      email: target.email,
      subscriptionStatus: target.subscriptionStatus,
      trialEndsAt: target.trialEndsAt,
    },
    null,
    2,
  ),
);
