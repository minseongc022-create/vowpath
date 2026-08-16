"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
};

export function PickupQrCode({ locale, reservationId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [error, setError] = useState(false);
  const [refreshIn, setRefreshIn] = useState(0);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/giu/pickup/qr?reservationId=${encodeURIComponent(reservationId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { token: string; expiresAt: number };
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setError(false);
    } catch {
      setError(true);
    }
  }, [reservationId]);

  useEffect(() => {
    void fetchToken();
    const poll = window.setInterval(() => void fetchToken(), 50_000);
    return () => window.clearInterval(poll);
  }, [fetchToken]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRefreshIn(left);
      if (left <= 0) void fetchToken();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, fetchToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !token) return;
    void QRCode.toCanvas(canvas, token, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#191F28", light: "#FFFFFF" },
    }).catch(() => setError(true));
  }, [token]);

  if (error) {
    return <p className="text-[12px] text-giu-muted">{t(locale, "qrFail")}</p>;
  }

  return (
    <div
      className="giu-pickup-qr-secure flex flex-col items-center gap-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="giu-pickup-qr-frame rounded-[20px] bg-white p-3 ring-1 ring-giu-border">
        {!token ? (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-[12px] text-giu-muted">
            {t(locale, "loading")}
          </div>
        ) : (
          <canvas ref={canvasRef} aria-label={t(locale, "pickupQr")} />
        )}
      </div>
      <p className="text-[11px] font-semibold text-giu-ink">
        {t(locale, "pickupQrRotate").replace("N", String(refreshIn || 60))}
      </p>
      <p className="text-[11px] text-giu-muted">{t(locale, "pickupQrHint")}</p>
    </div>
  );
}
