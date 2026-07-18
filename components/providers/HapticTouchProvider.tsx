"use client";

import { useEffect, type ReactNode } from "react";
import { hapticTap, isCoarsePointerDevice } from "@/lib/haptic";

const INTERACTIVE =
  "button, a, [role='button'], input, select, textarea, summary, [data-haptic], label";

export function HapticTouchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isCoarsePointerDevice()) return;

    let lastAt = 0;

    const pulse = () => {
      const now = Date.now();
      if (now - lastAt < 40) return;
      lastAt = now;
      hapticTap(12);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-no-haptic]")) return;
      if (!target.closest(INTERACTIVE)) return;
      pulse();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-no-haptic]")) return;
      if (!target.closest(INTERACTIVE)) return;
      pulse();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  return children;
}
