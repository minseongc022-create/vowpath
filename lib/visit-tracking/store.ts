import { randomBytes } from "crypto";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { publicTrackSnapshot } from "./public-snapshot";
import type { VisitTrackSession, VisitTrackStatus } from "./types";

export type { VisitTrackSession, VisitTrackStatus };
export { publicTrackSnapshot };

/** Active en-route sharing window. */
const TTL_SEC = 60 * 60 * 12; // 12 hours
/** After arrive/end: brief “visit complete” page, then tokens die. */
export const VISIT_TRACK_TERMINAL_TTL_SEC = 15 * 60;

function sessionKey(id: string) {
  return `visit-track:session:${id}`;
}
function customerTokenKey(token: string) {
  return `visit-track:cust:${token}`;
}
function techTokenKey(token: string) {
  return `visit-track:tech:${token}`;
}
function bookingKey(userId: string, bookingId: string) {
  return `visit-track:booking:${userId}:${bookingId}`;
}

function newToken(): string {
  return randomBytes(18).toString("base64url");
}

function isTerminalStatus(status: VisitTrackStatus): boolean {
  return status === "arrived" || status === "ended";
}

export function isVisitTrackExpired(session: VisitTrackSession | null): boolean {
  if (!session) return true;
  return new Date(session.expiresAt).getTime() <= Date.now();
}

async function persistSession(session: VisitTrackSession, ttlSec: number): Promise<void> {
  await Promise.all([
    kv.set(sessionKey(session.id), session, { ex: ttlSec }),
    kv.set(customerTokenKey(session.customerToken), session.id, { ex: ttlSec }),
    kv.set(techTokenKey(session.techToken), session.id, { ex: ttlSec }),
    kv.set(bookingKey(session.userId, session.bookingId), session.id, { ex: ttlSec }),
  ]);
}

function clearLiveLocation(session: VisitTrackSession): void {
  session.lat = null;
  session.lng = null;
  session.heading = null;
  session.speedMps = null;
}

export async function createOrGetVisitTrack(params: {
  userId: string;
  bookingId: string;
  shopName: string;
  customerName: string;
  techName: string;
  etaMinutes?: number | null;
  /** Staff texted departing — show en route even before GPS. */
  departed?: boolean;
}): Promise<VisitTrackSession> {
  const enRoute = params.departed === true || params.etaMinutes != null;
  const existingId = await kvGetSafe<string>(bookingKey(params.userId, params.bookingId));
  if (existingId) {
    const existing = await kvGetSafe<VisitTrackSession>(sessionKey(existingId));
    if (existing && !isVisitTrackExpired(existing) && !isTerminalStatus(existing.status)) {
      let changed = false;
      if (params.etaMinutes != null) {
        existing.etaMinutes = params.etaMinutes;
        changed = true;
      }
      if (enRoute && existing.status === "waiting") {
        existing.status = "en_route";
        existing.startedAt = existing.startedAt ?? new Date().toISOString();
        changed = true;
      }
      if (changed) {
        existing.updatedAt = new Date().toISOString();
        await persistSession(existing, TTL_SEC);
      }
      return existing;
    }
  }

  const id = newToken();
  const customerToken = newToken();
  const techToken = newToken();
  const now = new Date();
  const expires = new Date(now.getTime() + TTL_SEC * 1000);
  const session: VisitTrackSession = {
    id,
    userId: params.userId,
    bookingId: params.bookingId,
    customerToken,
    techToken,
    shopName: params.shopName,
    customerName: params.customerName,
    techName: params.techName,
    status: enRoute ? "en_route" : "waiting",
    etaMinutes: params.etaMinutes ?? null,
    startedAt: enRoute ? now.toISOString() : null,
    arrivedAt: null,
    lat: null,
    lng: null,
    heading: null,
    speedMps: null,
    updatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  await persistSession(session, TTL_SEC);
  return session;
}

export async function getVisitTrackByCustomerToken(
  token: string,
): Promise<VisitTrackSession | null> {
  const id = await kvGetSafe<string>(customerTokenKey(token));
  if (!id) return null;
  return (await kvGetSafe<VisitTrackSession>(sessionKey(id))) ?? null;
}

export async function getVisitTrackByTechToken(
  token: string,
): Promise<VisitTrackSession | null> {
  const id = await kvGetSafe<string>(techTokenKey(token));
  if (!id) return null;
  return (await kvGetSafe<VisitTrackSession>(sessionKey(id))) ?? null;
}

export async function updateVisitTrackLocation(params: {
  techToken: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speedMps?: number | null;
  etaMinutes?: number | null;
}): Promise<VisitTrackSession | null> {
  const session = await getVisitTrackByTechToken(params.techToken);
  if (!session || isVisitTrackExpired(session)) return null;
  if (isTerminalStatus(session.status)) return null;

  session.lat = params.lat;
  session.lng = params.lng;
  if (params.heading != null && Number.isFinite(params.heading)) {
    session.heading = params.heading;
  }
  if (params.speedMps != null && Number.isFinite(params.speedMps)) {
    session.speedMps = params.speedMps;
  }
  if (params.etaMinutes != null) session.etaMinutes = params.etaMinutes;
  if (session.status === "waiting") {
    session.status = "en_route";
    session.startedAt = session.startedAt ?? new Date().toISOString();
  }
  session.updatedAt = new Date().toISOString();
  await persistSession(session, TTL_SEC);
  return session;
}

export async function markVisitTrackArrived(techToken: string): Promise<VisitTrackSession | null> {
  const session = await getVisitTrackByTechToken(techToken);
  if (!session || isVisitTrackExpired(session)) return null;
  if (session.status === "ended") return session;

  session.status = "arrived";
  session.arrivedAt = new Date().toISOString();
  session.updatedAt = session.arrivedAt;
  // Stop broadcasting live coordinates once on site.
  clearLiveLocation(session);
  const expires = new Date(Date.now() + VISIT_TRACK_TERMINAL_TTL_SEC * 1000);
  session.expiresAt = expires.toISOString();
  await persistSession(session, VISIT_TRACK_TERMINAL_TTL_SEC);
  return session;
}

export async function endVisitTrack(techToken: string): Promise<VisitTrackSession | null> {
  const session = await getVisitTrackByTechToken(techToken);
  if (!session || isVisitTrackExpired(session)) return null;

  session.status = "ended";
  session.updatedAt = new Date().toISOString();
  clearLiveLocation(session);
  const expires = new Date(Date.now() + VISIT_TRACK_TERMINAL_TTL_SEC * 1000);
  session.expiresAt = expires.toISOString();
  await persistSession(session, VISIT_TRACK_TERMINAL_TTL_SEC);
  return session;
}

/**
 * Hard revoke when the booking is completed/cancelled — tracking links 404 immediately.
 * Keeps UX: no lingering map after the job is done.
 */
export async function revokeVisitTrackForBooking(
  userId: string,
  bookingId: string,
): Promise<void> {
  const id = await kvGetSafe<string>(bookingKey(userId, bookingId));
  if (!id) return;
  const session = await kvGetSafe<VisitTrackSession>(sessionKey(id));
  const dels: Promise<unknown>[] = [
    kv.del(sessionKey(id)),
    kv.del(bookingKey(userId, bookingId)),
  ];
  if (session) {
    dels.push(
      kv.del(customerTokenKey(session.customerToken)),
      kv.del(techTokenKey(session.techToken)),
    );
  }
  await Promise.all(dels);
}
