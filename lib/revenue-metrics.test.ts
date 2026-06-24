import { describe, expect, it } from "vitest";
import { parseJobberMoneyCents } from "./jobber-money";
import { buildRevenueMetrics } from "./revenue-metrics";
import type { RevenueFact } from "./revenue-facts";

describe("parseJobberMoneyCents", () => {
  it("parses numbers and strings", () => {
    expect(parseJobberMoneyCents(412.5)).toBe(41250);
    expect(parseJobberMoneyCents("199")).toBe(19900);
    expect(parseJobberMoneyCents({ amount: "50.25" })).toBe(5025);
  });
});

describe("buildRevenueMetrics", () => {
  it("sums collected and attributed totals in range", () => {
    const facts: RevenueFact[] = [
      {
        invoiceId: "1",
        invoiceStatus: "paid",
        issuedDate: "2026-06-10T12:00:00.000Z",
        collectedCents: 40000,
        invoicedCents: 40000,
        outstandingCents: 0,
        jobberJobIds: ["j1"],
        attributedToVowroad: true,
        updatedAt: "2026-06-10T12:00:00.000Z",
      },
      {
        invoiceId: "2",
        invoiceStatus: "paid",
        issuedDate: "2026-06-15T12:00:00.000Z",
        collectedCents: 25000,
        invoicedCents: 25000,
        outstandingCents: 0,
        jobberJobIds: ["j2"],
        attributedToVowroad: false,
        updatedAt: "2026-06-15T12:00:00.000Z",
      },
    ];

    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-30T23:59:59.999Z");
    const m = buildRevenueMetrics({
      facts,
      start,
      end,
      syncedAt: "2026-06-20T00:00:00.000Z",
      jobberConnected: true,
    });

    expect(m.collectedCents).toBe(65000);
    expect(m.attributedCollectedCents).toBe(40000);
    expect(m.invoiceCount).toBe(2);
    expect(m.attributedInvoiceCount).toBe(1);
  });
});
