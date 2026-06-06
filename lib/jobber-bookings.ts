import type { JobPriority } from "./types";

/** Normalized Jobber work request for dashboard analytics */
export type JobberBookingRecord = {
  requestId: string;
  title: string;
  customerName: string;
  address: string;
  phone?: string;
  requestStatus: string;
  source: string;
  createdAt: string;
  jobberWebUri?: string;
  clientId?: string;
  jobIds: string[];
};

export function priorityFromJobberTitle(title: string): JobPriority {
  if (/\bP1\b|긴급/i.test(title)) return "P1";
  if (/\bP2\b|당일/i.test(title)) return "P2";
  return "P3";
}

export function formatJobberAddress(
  property?: {
    address?: {
      street1?: string;
      street2?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    } | null;
  } | null,
): string {
  const addr = property?.address;
  if (!addr) return "";
  return [
    addr.street1,
    addr.street2,
    addr.city,
    addr.province,
    addr.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function isCountableJobberBooking(status: string): boolean {
  return status.toLowerCase() !== "archived";
}
