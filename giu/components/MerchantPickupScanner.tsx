"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { formatMoney } from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { isPickupQrToken } from "@/giu/lib/pickup-qr";

type Props = {
  locale: GiuLocale;
  onVerified?: () => void;
};

export function MerchantPickupScanner({ locale, onVerified }: Props) {
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const regionId = "giu-pickup-scanner";
  const money = (n: number) => formatMoney(n, "kr");

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const verifyToken = useCallback(
    async (token: string) => {
      if (busyRef.current) return;
      setBusy(true);
      busyRef.current = true;
      setError("");
      setMessage("");
      setDetail("");
      try {
        const res = await fetch("/api/giu/pickup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: token.trim() }),
        });
        const data = (await res.json()) as {
          error?: string;
          reservation?: { customerName: string; quantity: number };
          boxTitle?: string;
          netPayoutVnd?: number;
        };
        if (!res.ok) {
          setError(
            res.status === 410
              ? t(locale, "pickupScanExpired")
              : data.error ?? t(locale, "pickupScanFail"),
          );
          return;
        }
        hapticConfirm();
        setMessage(`${data.reservation?.customerName ?? ""} · ${t(locale, "mPickupDone")}`);
        const parts = [
          data.boxTitle ? `${t(locale, "mOrderProduct")}: ${data.boxTitle}` : "",
          data.reservation?.quantity
            ? `${t(locale, "mOrderQty")} ${data.reservation.quantity}${t(locale, "mUnitQty")}`
            : "",
          data.netPayoutVnd != null
            ? `${t(locale, "mOrderNet")} ${money(data.netPayoutVnd)} · ${t(locale, "mPickupScanSuccessSettle")}`
            : "",
        ].filter(Boolean);
        setDetail(parts.join(" · "));
        onVerified?.();
      } catch {
        setError(t(locale, "pickupScanFail"));
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [locale, onVerified],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* ignore */
      }
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    hapticSelect();
    setError("");
    setMessage("");
    setDetail("");
    setScanning(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const raw = decoded.trim();
          if (!isPickupQrToken(raw) || busyRef.current) return;
          void stopScanner().then(() => verifyToken(raw));
        },
        () => {},
      );
    } catch {
      setError(t(locale, "pickupCameraFail"));
      setScanning(false);
    }
  }, [locale, stopScanner, verifyToken]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="giu-card-flat space-y-3 p-4 ring-1 ring-giu-border">
      <div>
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "pickupScanTitle")}</p>
        <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "pickupScanSub")}</p>
        <p className="mt-1 text-[11px] text-giu-muted">{t(locale, "mPickupScanExpireHint")}</p>
      </div>

      {scanning ? (
        <div className="relative overflow-hidden rounded-[16px] bg-black">
          <div id={regionId} className="w-full" />
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[13px] font-bold text-white">
              {t(locale, "loading")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        {scanning ? (
          <button type="button" onClick={() => void stopScanner()} className="giu-btn-secondary !py-2.5 text-[13px]">
            {t(locale, "pickupScanStop")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startScanner()}
            className="giu-btn-primary !py-2.5 text-[13px]"
          >
            {t(locale, "pickupScanStart")}
          </button>
        )}
      </div>

      {message ? (
        <div className="giu-info-banner space-y-1 text-giu-accent">
          <p className="font-bold">{message}</p>
          {detail ? <p className="text-[12px] text-giu-ink">{detail}</p> : null}
        </div>
      ) : null}
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
    </div>
  );
}
