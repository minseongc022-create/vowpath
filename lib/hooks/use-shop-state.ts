"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readShopState } from "@/lib/shop-storage";
import type { ShopState } from "@/lib/types";

function loadShopState(): ShopState {
  if (typeof window === "undefined") {
    return {
      scheduleWindows: [],
      answerScheduleActive: false,
      scheduleAlwaysOn: false,
      jobberConnected: false,
      forwardingDone: false,
      onboardingComplete: false,
    };
  }
  return readShopState();
}

export function useShopState() {
  const pathname = usePathname();
  const [shop, setShop] = useState<ShopState>(loadShopState);
  const [ready, setReady] = useState(typeof window !== "undefined");

  const refresh = useCallback(() => {
    setShop(readShopState());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const sync = () => refresh();
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sync();
    });
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [refresh]);

  return { shop, setShop, refresh, ready };
}
