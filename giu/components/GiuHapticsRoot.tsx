"use client";

import { useEffect, type ReactNode } from "react";
import { hapticSelect } from "@/giu/lib/haptics";

/**
 * Light vibrate on every interactive tap (buttons / links / role=button).
 * No-op on desktop browsers without Vibration API.
 */
export function GiuHapticsRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-no-haptic]")) return;
      const hit = target.closest(
        'button:not([disabled]), [role="button"], a[href], input[type="submit"]:not([disabled]), input[type="button"]:not([disabled]), summary',
      );
      if (!hit) return;
      hapticSelect();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return <>{children}</>;
}
