"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { GiuMerchant } from "@/giu/lib/types";

export type GiuAuthAccount = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "merchant";
  market: "vn" | "kr";
};

type SessionPayload = {
  account: GiuAuthAccount | null;
  merchant?: GiuMerchant | null;
};

type GiuAuthState = {
  account: GiuAuthAccount | null;
  merchant: GiuMerchant | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Apply login/signup response immediately (avoids blank panel while /me reloads). */
  applySession: (data: SessionPayload) => void;
  logout: () => Promise<void>;
};

const GiuAuthContext = createContext<GiuAuthState | null>(null);

const ME_TIMEOUT_MS = 8000;

export function GiuAuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<GiuAuthAccount | null>(null);
  const [merchant, setMerchant] = useState<GiuMerchant | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((data: SessionPayload) => {
    setAccount(data.account);
    setMerchant(data.merchant ?? null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), ME_TIMEOUT_MS);
    try {
      const res = await fetch("/api/giu/auth/me", {
        credentials: "include",
        signal: ac.signal,
      });
      const data = (await res.json()) as SessionPayload;
      setAccount(data.account);
      setMerchant(data.merchant ?? null);
    } catch {
      // Keep existing session on timeout/network blip if we already have one.
      setAccount((prev) => prev);
      setMerchant((prev) => prev);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/giu/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    setAccount(null);
    setMerchant(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!account || account.role !== "customer") return;
    void import("@/giu/lib/favorites").then(({ syncFavoritesWithServer }) =>
      syncFavoritesWithServer().then(() => {
        window.dispatchEvent(new CustomEvent("giu-favorites-changed"));
      }),
    );
  }, [account?.id, account?.role]);

  return (
    <GiuAuthContext.Provider
      value={{ account, merchant, loading, refresh, applySession, logout }}
    >
      {children}
    </GiuAuthContext.Provider>
  );
}

export function useGiuAuth(): GiuAuthState {
  const ctx = useContext(GiuAuthContext);
  if (!ctx) {
    throw new Error("useGiuAuth must be used within GiuAuthProvider");
  }
  return ctx;
}
