"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchShopProfile } from "@/lib/shop-profile-client";
import {
  getDefaultShopState,
  normalizeShopState,
  readShopState,
  writeShopState,
} from "@/lib/shop-storage";
import type { ShopState } from "@/lib/types";

function loadShopState(): ShopState {
  return getDefaultShopState();
}

export function useShopState() {
  const pathname = usePathname();
  const [shop, setShop] = useState<ShopState>(loadShopState);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setShop(readShopState());
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const server = await fetchShopProfile();
      if (server) {
        setShop(normalizeShopState(server));
      } else {
        setShop(readShopState());
      }
    } finally {
      setReady(true);
      setSyncing(false);
    }
  }, []);

  const setShopPersist = useCallback((next: ShopState | ((prev: ShopState) => ShopState)) => {
    setShop((prev) => {
      const resolved = normalizeShopState(
        typeof next === "function" ? next(prev) : next,
      );
      writeShopState(resolved);
      return resolved;
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const sync = () => void refresh();
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

  return { shop, setShop: setShopPersist, refresh, ready, syncing };
}
