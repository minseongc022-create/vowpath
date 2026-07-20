"use client";

import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";

export function useUserPlan(): PlanId | null {
  const [plan, setPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/billing/status", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { plan?: string | null } | null) => {
        if (d?.plan) setPlan(normalizePlanId(d.plan));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return plan;
}
