"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { MerchantPickupScanner } from "@/giu/components/MerchantPickupScanner";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type PickupView = "qr" | "code";

type MerchantPickupContextValue = {
  openPickupSheet: (view?: PickupView) => void;
  fillPickupCode: (code: string) => void;
  registerOnVerified: (fn: () => void) => () => void;
};

const MerchantPickupContext = createContext<MerchantPickupContextValue | null>(null);

export function useMerchantPickup() {
  const ctx = useContext(MerchantPickupContext);
  if (!ctx) {
    throw new Error("useMerchantPickup must be used within MerchantPickupProvider");
  }
  return ctx;
}

/** Optional hook — returns null outside provider (e.g. auth pages). */
export function useMerchantPickupOptional() {
  return useContext(MerchantPickupContext);
}

type Props = {
  locale: GiuLocale;
  enabled?: boolean;
  children: ReactNode;
};

export function MerchantPickupProvider({ locale, enabled = true, children }: Props) {
  const [pickupSheetOpen, setPickupSheetOpen] = useState(false);
  const [pickupView, setPickupView] = useState<PickupView>("qr");
  const [pickupCodeDraft, setPickupCodeDraft] = useState("");
  const verifiedListeners = useRef(new Set<() => void>());

  const openPickupSheet = useCallback((view: PickupView = "qr") => {
    if (!enabled) return;
    hapticSelect();
    setPickupView(view);
    setPickupSheetOpen(true);
  }, [enabled]);

  const fillPickupCode = useCallback(
    (code: string) => {
      if (!enabled) return;
      hapticSelect();
      setPickupCodeDraft(code.toUpperCase());
      openPickupSheet("code");
    },
    [enabled, openPickupSheet],
  );

  const registerOnVerified = useCallback((fn: () => void) => {
    verifiedListeners.current.add(fn);
    return () => verifiedListeners.current.delete(fn);
  }, []);

  const notifyVerified = useCallback(() => {
    verifiedListeners.current.forEach((fn) => fn());
  }, []);

  const value: MerchantPickupContextValue = {
    openPickupSheet,
    fillPickupCode,
    registerOnVerified,
  };

  return (
    <MerchantPickupContext.Provider value={value}>
      {children}
      {enabled ? (
        <GiuBottomSheet
          open={pickupSheetOpen}
          onClose={() => setPickupSheetOpen(false)}
          dismissLabel={t(locale, "mCloseSheet")}
          ariaLabelledBy="giu-pickup-sheet-title"
        >
          <MerchantPickupScanner
            locale={locale}
            layout="sheet"
            initialView={pickupView}
            pickupCode={pickupCodeDraft}
            onPickupCodeChange={setPickupCodeDraft}
            onVerified={() => {
              notifyVerified();
              setPickupSheetOpen(false);
            }}
          />
        </GiuBottomSheet>
      ) : null}
    </MerchantPickupContext.Provider>
  );
}
