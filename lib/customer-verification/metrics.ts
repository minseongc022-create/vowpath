import type { CustomerVerificationRecord } from "./types";

export function computeCustomerVerificationRate(
  records: CustomerVerificationRecord[],
): { ratePct: number; verified: number; total: number } {
  const terminal = records.filter(
    (r) =>
      r.status === "verified" ||
      r.status === "needs_review" ||
      r.status === "unverified",
  );
  const verified = terminal.filter((r) => r.status === "verified").length;
  const total = terminal.length;
  if (total === 0) {
    const pending = records.filter((r) => r.status === "pending_response").length;
    if (pending === 0) return { ratePct: 0, verified: 0, total: 0 };
    return { ratePct: 0, verified: 0, total: pending };
  }
  const ratePct = Math.round((verified / total) * 100);
  return { ratePct, verified, total };
}

export function formatVerificationRateDisplay(ratePct: number, total: number): string {
  if (total === 0) return "—";
  return `${ratePct}%`;
}
