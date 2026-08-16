"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GiuConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="giu-sheet-backdrop !items-center" role="presentation">
      <button type="button" className="giu-sheet-dismiss" aria-label={cancelLabel} onClick={onCancel} />
      <div className="giu-confirm-sheet giu-panel-enter" role="alertdialog" aria-modal="true">
        <h3 className="text-[16px] font-bold text-giu-ink">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-giu-muted">{message}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={danger ? "giu-btn-danger giu-btn-3d !py-3" : "giu-btn-primary giu-btn-3d !py-3"}
          >
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className="giu-btn-secondary giu-btn-3d !py-3">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
