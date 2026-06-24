/**
 * Shared E2E helpers: resolve dev user + JWT session cookie.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { loadEnvLocal, authSecret } from "./load-env.mjs";

loadEnvLocal();

const USERS_FILE = join(process.cwd(), "data", "users.json");

function readFileUsers() {
  if (!existsSync(USERS_FILE)) return { users: [] };
  return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
}

function writeFileUsers(store) {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Ensure a local dev user exists (file store). Returns user record. */
export function ensureDevUser() {
  const store = readFileUsers();
  const defaultId = process.env.TWILIO_DEFAULT_USER_ID?.trim();
  let user =
    (defaultId && store.users.find((u) => u.id === defaultId)) ||
    store.users[0];

  if (user) return user;

  const id = defaultId || randomUUID();
  const passwordHash = bcrypt.hashSync("dev-test-pass-123", 10);
  user = {
    id,
    email: "dev-e2e@effiroad.local",
    passwordHash,
    shopName: "Dev HVAC Shop",
    phone: process.env.TWILIO_OWNER_ALERT_PHONE?.trim() || "+15125550100",
    createdAt: new Date().toISOString(),
    sessionVersion: 0,
    plan: "unlimited",
  };
  store.users.push(user);
  writeFileUsers(store);
  console.log(`[e2e] Seeded dev user ${user.email} (${user.id})`);
  return user;
}

export async function createSessionToken(user) {
  const key = new TextEncoder().encode(authSecret());
  return new SignJWT({
    email: user.email,
    shopName: user.shopName,
    sessionVersion: user.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2592000s")
    .sign(key);
}

export async function sessionHeaders(user) {
  const token = await createSessionToken(user);
  return {
    "Content-Type": "application/json",
    Cookie: `nightcall_session=${token}`,
  };
}

export async function apiFetch(base, path, user, opts = {}) {
  const headers = await sessionHeaders(user);
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

export function loadSmsDedupe() {
  const path = join(process.cwd(), "data", "sms-dedupe.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export function smsPreviewEnabled() {
  const v = process.env.SMS_DEV_PREVIEW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function assertSmsDedupe(userId, dedupeKey, shouldExist, label, fail) {
  const dedupe = loadSmsDedupe();
  const exists = Boolean(dedupe[userId]?.[dedupeKey]);
  if (shouldExist && !exists && !smsPreviewEnabled()) {
    fail(`${label}: expected SMS dedupe "${dedupeKey}"`);
  }
  if (!shouldExist && exists) {
    fail(`${label}: SMS dedupe "${dedupeKey}" should NOT exist yet`);
  }
  if (exists) {
    console.log(`✓ ${label}: SMS dedupe ${dedupeKey}`);
  } else if (smsPreviewEnabled() && shouldExist) {
    console.log(`✓ ${label}: SMS_DEV_PREVIEW — check dev server [sms] log for ${dedupeKey}`);
  } else if (!shouldExist) {
    console.log(`✓ ${label}: no premature SMS (${dedupeKey})`);
  }
}
