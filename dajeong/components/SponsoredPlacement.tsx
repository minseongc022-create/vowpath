"use client";

import { useEffect, useState } from "react";
import type { DajeongPlan } from "../lib/types";

type Placement = {
  attributionToken: string;
  disclosure: "Sponsored";
  merchant: { name: string; region: string };
  creative: { headline: string; body: string; imageUrl?: string; destinationUrl: string };
};

function budgetBucket(value: number): "low" | "medium" | "high" {
  return value < 100_000 ? "low" : value < 300_000 ? "medium" : "high";
}

export function SponsoredPlacement({ plan, surface }: { plan: DajeongPlan; surface: "plan_sidebar" | "execution_footer" }) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const categoriesKey = Array.from(new Set(plan.items.map((item) => item.category))).sort().join(",");
  useEffect(() => {
    let active = true;
    fetch("/api/dajeong/ads/serve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: { region: plan.situation.region, categories: categoriesKey.split(",").filter(Boolean), occasion: plan.situation.occasion, budgetBucket: budgetBucket(plan.budget), planId: plan.id }, surface }),
    }).then((response) => response.json()).then((data: { placement?: Placement | null }) => {
      if (!active || !data.placement) return;
      setPlacement(data.placement);
      try {
        const key = `haruwith:ad-attribution:${plan.id}`;
        const previous = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
        localStorage.setItem(key, JSON.stringify(Array.from(new Set([data.placement.attributionToken, ...previous])).slice(0, 10)));
      } catch { /* the impression remains recorded server-side */ }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [plan.id, plan.budget, categoriesKey, plan.situation.occasion, plan.situation.region, surface]);
  if (!placement) return null;
  async function openSponsored() {
    await fetch("/api/dajeong/ads/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attributionToken: placement!.attributionToken, type: "click", planId: plan.id }) }).catch(() => undefined);
    window.open(placement!.creative.destinationUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <aside className="dj-sponsored" aria-label="스폰서 광고">
      <span>Sponsored · 광고</span>
      <div><strong>{placement.creative.headline}</strong><small>{placement.merchant.name} · {placement.merchant.region}</small><p>{placement.creative.body}</p></div>
      <button type="button" onClick={openSponsored}>자세히 보기</button>
      <em>광고 노출이며 Haruwith의 추천 순위나 계획에는 영향을 주지 않아요.</em>
    </aside>
  );
}
