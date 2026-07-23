import { randomBytes } from "crypto";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";

export type VisitTrackStatus = "waiting" | "en_route" | "arrived" | "ended";

export type VisitTrackSession = {
  id: string;
  userId: string;
  bookingId: string;
  customerToken: string;
  techToken: string;
  shopName: string;
  customerName: string;
  techName: string;
  status: VisitTrackStatus;
  etaMinutes: number | null;
  startedAt: string | null;
  arrivedAt: string | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speedMps: number | null;
  updatedAt: string;
  expiresAt: string;
};

const TTL_SEC = 60 * 60 * 12; // 12 hours

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

export async function createOrGetVisitTrack(params: {
  userId: string;
  bookingId: string;
  shopName: string;
  customerName: string;
  techName: string;
  etaMinutes?: number | null;
}): Promise<VisitTrackSession> {
  const existingId = await kvGetSafe<string>(bookingKey(params.userId, params.bookingId));
  if (existingId) {
    const existing = await kvGetSafe<VisitTrackSession>(sessionKey(existingId));
    if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
      if (params.etaMinutes != null) {
        existing.etaMinutes = params.etaMinutes;
        existing.status = existing.status === "waiting" ? "en_route" : existing.status;
        existing.startedAt = existing.startedAt ?? new Date().toISOString();
        existing.updatedAt = new Date().toISOString();
        await kv.set(sessionKey(existing.id), existing, { ex: TTL_SEC });
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
    status: params.etaMinutes != null ? "en_route" : "waiting",
    etaMinutes: params.etaMinutes ?? null,
    startedAt: params.etaMinutes != null ? now.toISOString() : null,
    arrivedAt: null,
    lat: null,
    lng: null,
    heading: null,
    speedMps: null,
    updatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  await Promise.all([
    kv.set(sessionKey(id), session, { ex: TTL_SEC }),
    kv.set(customerTokenKey(customerToken), id, { ex: TTL_SEC }),
    kv.set(techTokenKey(techToken), id, { ex: TTL_SEC }),
    kv.set(bookingKey(params.userId, params.bookingId), id, { ex: TTL_SEC }),
  ]);

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
  if (!session) return null;
  if (session.status === "ended" || session.status === "arrived") return session;

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
  await kv.set(sessionKey(session.id), session, { ex: TTL_SEC });
  return session;
}

export async function markVisitTrackArrived(techToken: string): Promise<VisitTrackSession | null> {
  const session = await getVisitTrackByTechToken(techToken);
  if (!session) return null;
  session.status = "arrived";
  session.arrivedAt = new Date().toISOString();
  session.updatedAt = session.arrivedAt;
  await kv.set(sessionKey(session.id), session, { ex: TTL_SEC });
  return session;
}

export async function endVisitTrack(techToken: string): Promise<VisitTrackSession | null> {
  const session = await getVisitTrackByTechToken(techToken);
  if (!session) return null;
  session.status = "ended";
  session.updatedAt = new Date().toISOString();
  await kv.set(sessionKey(session.id), session, { ex: TTL_SEC });
  return session;
}

export function publicTrackSnapshot(session: VisitTrackSession) {
  return {
    status: session.status,
    shopName: session.shopName,
    techName: session.techName,
    customerName: session.customerName,
    etaMinutes: session.etaMinutes,
    lat: session.lat,
    lng: session.lng,
    heading: session.heading,
    updatedAt: session.updatedAt,
    startedAt: session.startedAt,
    arrivedAt: session.arrivedAt,
  };
}
