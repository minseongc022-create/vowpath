"use client";

import { useEffect } from "react";

type Props = {
  targetId?: string;
  from?: string;
};

/** Scroll to extension/refund section when opened from SMS reminder link. */
export function ReservationDeepLinkScroll({ targetId, from }: Props) {
  useEffect(() => {
    if (!from) return;
    const id = targetId ?? (from.startsWith("rem") ? "giu-extension-form" : undefined);
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => window.clearTimeout(t);
  }, [from, targetId]);

  return null;
}
