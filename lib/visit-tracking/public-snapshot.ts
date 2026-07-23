import type { VisitTrackSession, VisitTrackStatus } from "./types";

function isTerminalStatus(status: VisitTrackStatus): boolean {
  return status === "arrived" || status === "ended";
}

/** Public customer/tech payload — never leak coords after arrive/end. */
export function publicTrackSnapshot(session: VisitTrackSession) {
  const terminal = isTerminalStatus(session.status);
  return {
    status: session.status,
    shopName: session.shopName,
    techName: session.techName,
    customerName: session.customerName,
    etaMinutes: terminal ? null : session.etaMinutes,
    lat: terminal ? null : session.lat,
    lng: terminal ? null : session.lng,
    heading: terminal ? null : session.heading,
    updatedAt: session.updatedAt,
    startedAt: session.startedAt,
    arrivedAt: session.arrivedAt,
  };
}
