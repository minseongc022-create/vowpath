"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { GiuMerchant } from "@/giu/lib/types";

export type GiuAuthAccount = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "merchant";
  market: "vn" | "kr";
};

type GiuAuthState = {
  account: GiuAuthAccount | null;
  merchant: GiuMerchant | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const GiuAuthContext = createContext<GiuAuthState | null>(null);

export function GiuAuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<GiuAuthAccount | null>(null);
  const [merchant, setMerchant] = useState<GiuMerchant | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/giu/auth/me", { credentials: "include" });
      const data = (await res.json()) as {
        account: GiuAuthAccount | null;
        merchant?: GiuMerchant | null;
      };
      setAccount(data.account);
      setMerchant(data.merchant ?? null);
    } catch {
      setAccount(null);
      setMerchant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/giu/auth/logout", { method: "POST", credentials: "include" });
    setAccount(null);
    setMerchant(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <GiuAuthContext.Provider value={{ account, merchant, loading, refresh, logout }}>
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
