/** Default HVAC service ticket (USD) when shop has no custom average. */
export const DEFAULT_AVERAGE_JOB_USD = 400;

export function estimateRevenueProtectedUsd(
  securedCustomerCount: number,
  averageJobUsd: number = DEFAULT_AVERAGE_JOB_USD,
): number {
  return Math.max(0, Math.round(securedCustomerCount * averageJobUsd));
}

export function formatRevenueUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
