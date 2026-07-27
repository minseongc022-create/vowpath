"use client";

import { useEffect, useState } from "react";
import { ClosePingOverview } from "@/components/closeping/ClosePingDashboard";
import type { ClosePingStats } from "@/lib/closeping/quotes-core";

const EMPTY_STATS: ClosePingStats = {
  openCount: 0,
  chasingCount: 0,
  wonThisMonth: 0,
  pipelineCents: 0,
  recoveredCents: 0,
};

export function ClosePingOverviewClient() {
  const [stats, setStats] = useState<ClosePingStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/closeping/quotes");
        const data = (await res.json()) as { stats?: ClosePingStats };
        setStats(data.stats ?? EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  return <ClosePingOverview stats={stats} />;
}
