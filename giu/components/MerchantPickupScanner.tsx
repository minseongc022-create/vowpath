"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { formatMoney } from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { isPickupQrToken } from "@/giu/lib/pickup-qr";
import { MerchantPickupConfirm, type PickupPreview } from "./MerchantPickupConfirm";

type Props = {
  locale: GiuLocale;
  onVerified?: () => void;
  pickupCode?: string;
  onPickupCodeChange?: (code: string) => void;
  /** sheet = QR first, code via fallback button */
  layout?: "full" | "sheet";
  initialView?: "qr" | "code";
};

type VerifyPayload = { token?: string; code?: string };

export function MerchantPickupScanner({
  locale,
  onVerified,
  pickupCode: pickupCodeProp,
  onPickupCodeChange,
  layout = "full",
  initialView = "qr",
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [internalCode, setInternalCode] = useState("");
  const [view, setView] = useState<"qr" | "code">(initialView);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [pending, setPending] = useState<PickupPreview | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const regionId = "giu-pickup-scanner-view";
  const money = (n: number) => formatMoney(n, "kr");
  const sheetMode = layout === "sheet";

  const pickupCode = pickupCodeProp ?? internalCode;
  const setPickupCode = onPickupCodeChange ?? setInternalCode;

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const resetPending = useCallback(() => {
    setPending(null);
    setError("");
  }, []);

  const showPickupResult = useCallback(
    (data: PickupPreview) => {
      hapticConfirm();
      setPending(null);
      setMessage(`${data.reservation.customerName} · ${t(locale, "mPickupDone")}`);
      const parts = [
        data.box?.title ? `${t(locale, "mOrderProduct")}: ${data.box.title}` : "",
        `${t(locale, "mOrderQty")} ${data.reservation.quantity}${t(locale, "mUnitQty")}`,
        `${t(locale, "mOrderNet")} ${money(data.netPayoutVnd)} · ${t(locale, "mPickupScanSuccessSettle")}`,
      ].filter(Boolean);
      setDetail(parts.join(" · "));
      setPickupCode("");
      setView("qr");
      onVerified?.();
    },
    [locale, money, onVerified, setPickupCode],
  );

  const previewPickup = useCallback(
    async (payload: VerifyPayload) => {
      if (busyRef.current) return;
      setBusy(true);
      busyRef.current = true;
      setError("");
      setMessage("");
      setDetail("");
      try {
        const res = await fetch("/api/giu/pickup/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as PickupPreview & { error?: string };
        if (!res.ok) {
          setError(
            res.status === 410
              ? t(locale, "pickupScanExpired")
              : data.error ?? t(locale, "pickupScanFail"),
          );
          return;
        }
        hapticSelect();
        setPending(data);
      } catch {
        setError(t(locale, "pickupScanFail"));
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [locale],
  );

  const confirmPickup = useCallback(async () => {
    if (!pending || busyRef.current) return;
    setBusy(true);
    busyRef.current = true;
    setError("");
    try {
      const res = await fetch("/api/giu/pickup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reservationId: pending.reservation.id }),
      });
      const data = (await res.json()) as PickupPreview & { error?: string };
      if (!res.ok) {
        setError(data.error ?? t(locale, "pickupScanFail"));
        return;
      }
      showPickupResult({
        reservation: pending.reservation,
        box: pending.box,
        netPayoutVnd: data.netPayoutVnd ?? pending.netPayoutVnd,
      });
    } catch {
      setError(t(locale, "pickupScanFail"));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, [locale, pending, showPickupResult]);

  const verifyToken = useCallback(
    async (token: string) => previewPickup({ token: token.trim() }),
    [previewPickup],
  );

  const verifyCode = useCallback(async () => {
    const code = pickupCode.trim().replace(/\s/g, "");
    if (!/^\d{3}$/.test(code) || busyRef.current) return;
    hapticSelect();
    await previewPickup({ code });
  }, [pickupCode, previewPickup]);

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
    resetPending();
    setCameraError("");
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
      setCameraError(t(locale, "pickupCameraFail"));
      setScanning(false);
    }
  }, [locale, resetPending, stopScanner, verifyToken]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (sheetMode && view === "code") void stopScanner();
  }, [sheetMode, view, stopScanner]);

  const showCodeSection = !pending && (!sheetMode || view === "code");
  const showQrSection = !pending && (!sheetMode || view === "qr");

  const qrBlock = (
    <div className="space-y-3 rounded-[16px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
      <p className="text-[12px] font-bold text-giu-ink">{t(locale, "mPickupQrSection")}</p>
      <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "pickupScanSub")}</p>

      {scanning ? (
        <div className="relative overflow-hidden rounded-[14px] bg-black">
          <div id={regionId} className="w-full" />
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[13px] font-bold text-white">
              {t(locale, "loading")}
            </div>
          ) : null}
        </div>
      ) : null}

      {scanning ? (
        <button
          type="button"
          onClick={() => void stopScanner()}
          className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[14px]"
        >
          {t(locale, "pickupScanStop")}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startScanner()}
          className="giu-btn-primary giu-btn-3d w-full !py-3 text-[14px]"
        >
          {t(locale, "pickupScanStart")}
        </button>
      )}

      {cameraError ? <p className="text-[12px] text-giu-danger">{cameraError}</p> : null}

      {sheetMode && view === "qr" ? (
        <button
          type="button"
          onClick={() => {
            hapticSelect();
            void stopScanner();
            setView("code");
          }}
          className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[14px]"
        >
          {t(locale, "mPickupCodeFallback")}
        </button>
      ) : null}
    </div>
  );

  const codeBlock = (
    <form
      className="space-y-3 rounded-[16px] bg-giu-bg/80 p-3 ring-1 ring-giu-border"
      onSubmit={(e) => {
        e.preventDefault();
        void verifyCode();
      }}
    >
      <div>
        <p className="text-[12px] font-bold text-giu-ink">{t(locale, "mPickupCodeLabel")}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-giu-muted">{t(locale, "mPickupCodeHint")}</p>
      </div>
      <input
        value={pickupCode}
        onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
        placeholder={t(locale, "mPickupCodePlaceholder")}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="numeric"
        maxLength={3}
        pattern="\d{3}"
        className="giu-input text-center font-mono text-[22px] font-bold tracking-[0.35em]"
      />
      <button
        type="submit"
        disabled={busy || !/^\d{3}$/.test(pickupCode.trim())}
        className="giu-btn-primary giu-btn-3d w-full !py-3 text-[14px]"
      >
        {busy ? t(locale, "loading") : t(locale, "mPickupCodeConfirm")}
      </button>
      {sheetMode ? (
        <button
          type="button"
          onClick={() => {
            hapticSelect();
            setView("qr");
          }}
          className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[14px]"
        >
          {t(locale, "pickupScanStart")}
        </button>
      ) : null}
    </form>
  );

  return (
    <div
      id={sheetMode ? undefined : "giu-pickup-scanner"}
      className={sheetMode ? "space-y-3" : "giu-card-flat space-y-4 p-4 ring-1 ring-giu-border"}
    >
      {!sheetMode ? (
        <div>
          <p className="text-[15px] font-bold text-giu-ink">{t(locale, "pickupScanTitle")}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-giu-muted">{t(locale, "mPickupScanExpireHint")}</p>
        </div>
      ) : (
        <div>
          <h3 id="giu-pickup-sheet-title" className="text-[17px] font-bold text-giu-ink">
            {t(locale, "pickupScanTitle")}
          </h3>
          <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mPickupScanExpireHint")}</p>
        </div>
      )}

      {pending ? (
        <MerchantPickupConfirm
          locale={locale}
          preview={pending}
          busy={busy}
          onConfirm={() => void confirmPickup()}
          onCancel={() => {
            hapticSelect();
            resetPending();
            setPickupCode("");
          }}
        />
      ) : null}

      {showQrSection ? qrBlock : null}

      {!sheetMode && showCodeSection ? (
        <>
          <div className="flex items-center gap-3 px-1">
            <div className="giu-divider flex-1" />
            <span className="text-[11px] font-bold text-giu-muted">{t(locale, "mPickupOr")}</span>
            <div className="giu-divider flex-1" />
          </div>
          {codeBlock}
        </>
      ) : null}

      {sheetMode && showCodeSection ? codeBlock : null}

      {message ? (
        <div className="giu-info-banner space-y-1 text-giu-primary">
          <p className="font-bold">{message}</p>
          {detail ? <p className="text-[12px] text-giu-ink">{detail}</p> : null}
        </div>
      ) : null}
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
    </div>
  );
}
