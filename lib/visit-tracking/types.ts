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
