import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { getTwilioDefaultUserId } from "./twilio-config";
import { useKvStore } from "./kv-config";

const DATA_DIR = path.join(process.cwd(), "data");
const PHONE_MAP_FILE = path.join(DATA_DIR, "twilio-phone-map.json");

function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export { normalizeE164 };

async function lookupMappedUser(phone: string): Promise<string | null> {
  const e164 = normalizeE164(phone);
  if (useKvStore()) {
    const mapped = await kv.get<string>(kvKey(e164));
    return mapped ?? null;
  }
  const store = await readFileMap();
  return store.mappings[e164] ?? null;
}

function kvKey(phone: string) {
  return `effiroad:twilio-phone:${normalizeE164(phone)}`;
}

type PhoneMapStore = { mappings: Record<string, string> };

async function readFileMap(): Promise<PhoneMapStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(PHONE_MAP_FILE, "utf-8");
    return JSON.parse(raw) as PhoneMapStore;
  } catch {
    return { mappings: {} };
  }
}

async function writeFileMap(store: PhoneMapStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PHONE_MAP_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Bind a Twilio inbound number to a tenant user (strict isolation). */
export async function bindTwilioPhoneToUser(
  phoneNumber: string,
  userId: string,
): Promise<void> {
  const key = normalizeE164(phoneNumber);
  if (useKvStore()) {
    await kv.set(kvKey(key), userId);
    const { setUserTwilioBoundMarker, ensurePilotTrial } = await import("./pilot-trial");
    await setUserTwilioBoundMarker(userId, key);
    await ensurePilotTrial(userId);
    return;
  }
  const store = await readFileMap();
  store.mappings[key] = userId;
  await writeFileMap(store);
  const { ensurePilotTrial } = await import("./pilot-trial");
  await ensurePilotTrial(userId);
}

/**
 * Resolve tenant from called number (To). Falls back to TWILIO_DEFAULT_USER_ID.
 * When `from` is set, also checks the caller line — used when Twilio forwards
 * to Retell with callerId set to the shop's Twilio number.
 */
export async function resolveTenantUserId(params: {
  to: string;
  from?: string;
  callSid?: string;
}): Promise<string | null> {
  const to = normalizeE164(params.to);

  const toMapped = await lookupMappedUser(to);
  if (toMapped) return toMapped;

  const from = params.from?.trim();
  if (from) {
    const fromMapped = await lookupMappedUser(from);
    if (fromMapped) return fromMapped;
  }

  const fallback = getTwilioDefaultUserId();
  const sharedPhone = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (fallback && sharedPhone && normalizeE164(sharedPhone) === to) {
    return fallback;
  }
  if (fallback && sharedPhone && from && normalizeE164(sharedPhone) === normalizeE164(from)) {
    return fallback;
  }

  const allowFallback =
    process.env.ALLOW_TWILIO_DEFAULT_TENANT === "true" ||
    process.env.NODE_ENV === "development";

  if (fallback && allowFallback) {
    return fallback;
  }

  if (fallback && !allowFallback) {
    console.error(
      "[tenant-routing] TWILIO_DEFAULT_USER_ID ignored in production; bind phone to tenant:",
      to,
    );
  }

  console.error(
    "[tenant-routing] No tenant for To=",
    to,
    "From=",
    from ?? "",
    "callSid=",
    params.callSid,
  );
  return null;
}

/** Ensure session userId matches resource owner (defense in depth). */
export function assertTenantAccess(
  sessionUserId: string,
  resourceUserId: string,
): void {
  if (sessionUserId !== resourceUserId) {
    throw new Error("TENANT_FORBIDDEN");
  }
}
