/**
 * Node-only half of Pricepulse seller auth: bcrypt password check (not
 * Edge-safe) and cookie read/write (Server Actions, Route Handlers). The
 * actual request gate lives in middleware.ts, matching how the rest of this
 * app gates /dashboard, /onboarding, /settings.
 */
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import {
  createPricepulseSessionToken,
  PRICEPULSE_SESSION_COOKIE,
  PRICEPULSE_SESSION_MAX_AGE_SECONDS,
  verifyPricepulseSessionToken,
  type PricepulseSessionPayload,
} from "./session.ts";

export { PRICEPULSE_SESSION_COOKIE };

export type SellerRecord = {
  id: string;
  email: string;
  displayName: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDashboardDbConfigured(): boolean {
  return Boolean(
    process.env.PRICEPULSE_SUPABASE_URL?.trim() &&
      process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function client() {
  const url = process.env.PRICEPULSE_SUPABASE_URL?.trim();
  const key = process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Pricepulse: Supabase not configured (see pricepulse/README.md)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 8+ chars is the whole bar for a free-beta signup — no composition rules to fight with. */
export function isPasswordStrongEnough(password: string): boolean {
  return password.length >= 8;
}

export async function registerSeller(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ seller: SellerRecord } | { error: string }> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) return { error: "이메일 형식이 올바르지 않습니다" };
  if (!isPasswordStrongEnough(input.password)) return { error: "비밀번호는 8자 이상이어야 합니다" };

  const db = client();
  const { data: existing, error: lookupError } = await db
    .from("pricepulse_sellers")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) throw new Error(`registerSeller lookup: ${lookupError.message}`);
  if (existing) return { error: "이미 가입된 이메일입니다" };

  const { data, error } = await db
    .from("pricepulse_sellers")
    .insert({
      email,
      password_hash: await hashPassword(input.password),
      display_name: input.displayName?.trim() || null,
    })
    .select("id, email, display_name")
    .single();
  if (error) throw new Error(`registerSeller insert: ${error.message}`);

  return { seller: { id: data.id, email: data.email, displayName: data.display_name } };
}

export async function authenticateSeller(input: {
  email: string;
  password: string;
}): Promise<{ seller: SellerRecord } | { error: string }> {
  const email = normalizeEmail(input.email);
  const db = client();
  const { data, error } = await db
    .from("pricepulse_sellers")
    .select("id, email, display_name, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(`authenticateSeller: ${error.message}`);
  if (!data) return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };

  const ok = await verifyPassword(input.password, data.password_hash);
  if (!ok) return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };

  return { seller: { id: data.id, email: data.email, displayName: data.display_name } };
}

export async function getCurrentSeller(): Promise<PricepulseSessionPayload | null> {
  const store = await cookies();
  const token = store.get(PRICEPULSE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyPricepulseSessionToken(token);
}

export async function setSessionCookie(seller: PricepulseSessionPayload): Promise<void> {
  const store = await cookies();
  store.set(PRICEPULSE_SESSION_COOKIE, await createPricepulseSessionToken(seller), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/pricepulse",
    maxAge: PRICEPULSE_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(PRICEPULSE_SESSION_COOKIE, "", { path: "/pricepulse", maxAge: 0 });
}
