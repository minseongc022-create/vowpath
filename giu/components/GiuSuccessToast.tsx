"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
};

export function GiuSuccessToast({ message, onClose }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="giu-success-toast-backdrop" role="status" aria-live="polite">
      <div className="giu-success-toast giu-success-enter">
        <p className="text-[16px] font-extrabold tracking-tight text-giu-ink">{message}</p>
      </div>
    </div>
  );
}
