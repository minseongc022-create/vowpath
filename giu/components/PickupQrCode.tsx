"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  code: string;
  reservationId: string;
};

/** QR payload for merchant scanner — GIU:CODE */
export function pickupQrPayload(code: string): string {
  return `GIU:${code.trim().toUpperCase()}`;
}

export function PickupQrCode({ locale, code, reservationId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, pickupQrPayload(code), {
      width: 200,
      margin: 1,
      color: { dark: "#191F28", light: "#FFFFFF" },
    }).catch(() => setError(true));
  }, [code, reservationId]);

  if (error) {
    return (
      <p className="text-[12px] text-giu-muted">{t(locale, "qrFail")}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-[20px] bg-white p-3 ring-1 ring-giu-border">
        <canvas ref={canvasRef} aria-label={t(locale, "pickupQr")} />
      </div>
      <p className="text-[11px] text-giu-muted">{t(locale, "pickupQrHint")}</p>
    </div>
  );
}
