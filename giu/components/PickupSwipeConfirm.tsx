"use client";

import { useState } from "react";

/** TGTG-style confirm gesture — unlocks “show code” cue at the counter. */
export function PickupSwipeConfirm() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-[16px] bg-giu-accent-soft px-4 py-3 text-center text-[13px] font-bold text-giu-accent">
        ✓ 준비됨 — 가게에 코드를 보여주세요
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDone(true)}
      className="group relative w-full overflow-hidden rounded-[16px] bg-giu-ink px-4 py-3.5 text-left"
    >
      <span className="relative z-10 text-[13px] font-bold text-white">밀어서 픽업 확인 →</span>
      <span
        className="absolute inset-y-0 left-0 w-1/3 bg-giu-accent/40 transition-all duration-500 group-active:w-full"
        aria-hidden
      />
    </button>
  );
}
