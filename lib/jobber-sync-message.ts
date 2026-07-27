import { dashboardUi } from "./content";

/** Turn raw Jobber/GraphQL errors into operator-friendly notification text. */
export function friendlyJobberSyncBody(raw: string): string {
  const nf = dashboardUi.notificationEvents;
  const trimmed = raw.trim();
  if (!trimmed) return nf.jobberFailBodyGeneric;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("outstanding") ||
    lower.includes("invoicebalance") ||
    lower.includes("invoiceamounts") ||
    lower.includes("revenue")
  ) {
    return nf.jobberFailBodyRevenue;
  }
  if (lower.includes("not_connected") || lower.includes("jobber_not_connected")) {
    return nf.jobberFailBodyDisconnected;
  }
  if (
    trimmed.length > 100 ||
    lower.includes("graphql") ||
    lower.includes("doesn't exist on type") ||
    lower.includes("cannot query field")
  ) {
    return nf.jobberFailBodyGeneric;
  }
  return trimmed;
}
