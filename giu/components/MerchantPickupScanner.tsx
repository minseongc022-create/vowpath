"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  onVerified?: () => void;
};

function parseQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("GIU:")) return trimmed.slice(4).trim();
  if (/^[A-F0-9]{6}$/i.test(trimmed)) return trimmed;
  return null;
}

export function MerchantPickupScanner({ locale, onVerified }: Props) {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "giu-pickup-scanner";

  const verifyCode = useCallback(
    async (code: string) => {
      setBusy(true);
      setError("");
      setMessage("");
      try {
        const res = await fetch("/api/giu/pickup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const data = (await res.json()) as { error?: string; reservation?: { code: string } };
        if (!res.ok) {
          setError(data.error ?? t(locale, "pickupScanFail"));
          return;
        }
        hapticConfirm();
        setMessage(`${data.reservation?.code ?? code} · ${t(locale, "mPickupDone")}`);
        setManual("");
        onVerified?.();
      } catch {
        setError(t(locale, "pickupScanFail"));
      } finally {
        setBusy(false);
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
    setScanning(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const code = parseQrPayload(decoded);
          if (!code || busy) return;
          void stopScanner().then(() => verifyCode(code));
        },
        () => {},
      );
    } catch {
      setError(t(locale, "pickupCameraFail"));
      setScanning(false);
    }
  }, [busy, locale, stopScanner, verifyCode]);

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
      </div>

      {scanning ? (
        <div className="overflow-hidden rounded-[16px] bg-black">
          <div id={regionId} className="w-full" />
        </div>
      ) : null}

      <div className="flex gap-2">
        {scanning ? (
          <button type="button" onClick={() => void stopScanner()} className="giu-btn-secondary !py-2.5 text-[13px]">
            {t(locale, "pickupScanStop")}
          </button>
        ) : (
          <button type="button" onClick={() => void startScanner()} className="giu-btn-primary !py-2.5 text-[13px]">
            {t(locale, "pickupScanStart")}
          </button>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.trim() || busy) return;
          void verifyCode(manual.trim());
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          placeholder={t(locale, "mOrderSearch")}
          className="giu-input flex-1 font-mono text-[14px] uppercase"
          maxLength={8}
        />
        <button type="submit" disabled={busy || !manual.trim()} className="giu-btn-primary !w-auto shrink-0 !px-4 !py-2.5 text-[13px]">
          {t(locale, "mPickupYes")}
        </button>
      </form>

      {message ? <p className="giu-info-banner text-giu-accent">{message}</p> : null}
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
    </div>
  );
}
