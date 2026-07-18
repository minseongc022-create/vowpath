"use client";

import { useEffect, type ReactNode } from "react";
import { hapticTap, isCoarsePointerDevice } from "@/lib/haptic";

const INTERACTIVE =
  "button, a, [role='button'], input, select, textarea, label, summary, [data-haptic]";

export function HapticTouchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isCoarsePointerDevice()) return;

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-no-haptic]")) return;
      const interactive = target.closest(INTERACTIVE);
      if (!interactive) return;
      if (interactive instanceof HTMLInputElement) {
        const type = interactive.type;
        if (type === "range" || type === "checkbox" || type === "radio") {
          hapticTap(8);
          return;
        }
      }
      hapticTap(6);
    };

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    return () => document.removeEventListener("touchstart", onTouchStart, { capture: true });
  }, []);

  return children;
}
