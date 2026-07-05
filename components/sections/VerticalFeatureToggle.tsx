"use client";

import { useState, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";

const OPTIONS = [
  { id: "restoration" as const, label: "복구업체" },
  { id: "hvac" as const, label: "HVAC" },
];

/**
 * Lets a visitor flip the vertical-specific sections below (product stack, dispatch
 * policy, comparison, etc.) between restoration and HVAC copy without leaving the page —
 * the common hero/pricing/FAQ above and below stay put. Both variants are rendered
 * server-side and passed in as slots; this just toggles which one is visible.
 */
export function VerticalFeatureToggle({
  restoration,
  hvac,
}: {
  restoration: ReactNode;
  hvac: ReactNode;
}) {
  const [vertical, setVertical] = useState<"restoration" | "hvac">("restoration");

  return (
    <div>
      <div className="border-y border-brand-200/60 bg-brand-50/70 py-6">
        <Container>
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-4">
            <p className="text-sm font-medium text-stone-700">
              사장님 업종을 골라보세요 — 아래 기능 설명이 바로 바뀌어요
            </p>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-brand-300 bg-white p-0.5 shadow-sm">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVertical(opt.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    vertical === opt.id
                      ? "bg-brand-900 text-white shadow-sm"
                      : "text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {vertical === "restoration" ? restoration : hvac}
    </div>
  );
}
