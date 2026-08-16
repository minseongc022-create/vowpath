"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  dismissLabel: string;
  ariaLabelledBy?: string;
  children: React.ReactNode;
};

export function GiuBottomSheet({
  open,
  onClose,
  dismissLabel,
  ariaLabelledBy,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="giu-sheet-backdrop" role="presentation">
      <button type="button" className="giu-sheet-dismiss" aria-label={dismissLabel} onClick={onClose} />
      <div
        className="giu-sheet giu-sheet-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
