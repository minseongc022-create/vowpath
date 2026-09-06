import { isMerchantDeliveredOrder } from "./order-status";
import type { GiuReservation } from "./types";

export type MerchantCustomerInsights = {
  /** Unique customers who completed at least one GIUCUU pickup. */
  giuCustomers: number;
  /** Customers with 2+ completed pickups at this store. */
  repeatCustomers: number;
  completedPickups: number;
  totalSalesVnd: number;
};

export function computeMerchantCustomerInsights(
  reservations: GiuReservation[],
  merchantId: string,
): MerchantCustomerInsights {
  const completed = reservations.filter(
    (r) => r.merchantId === merchantId && isMerchantDeliveredOrder(r),
  );
  const counts = new Map<string, number>();
  for (const r of completed) {
    counts.set(r.customerId, (counts.get(r.customerId) ?? 0) + 1);
  }
  const giuCustomers = counts.size;
  const repeatCustomers = [...counts.values()].filter((n) => n >= 2).length;
  return {
    giuCustomers,
    repeatCustomers,
    completedPickups: completed.length,
    totalSalesVnd: completed.reduce((s, r) => s + r.totalVnd, 0),
  };
}
