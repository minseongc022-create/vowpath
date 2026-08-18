"use client";

import { JiucuSvg, type JiucuVariant } from "./JiucuSvg";

type Props = {
  variant?: JiucuVariant;
  /** 2D static or 3D floating animation */
  mode?: "2d" | "3d";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  caption?: string;
  bubble?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-7 w-7",
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

export function JiucuMascot({
  variant = "default",
  mode = "2d",
  size = "md",
  className = "",
  caption,
  bubble,
}: Props) {
  const animated = mode === "3d";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className={`relative ${animated ? "giu-jiucu-3d" : ""}`}>
        {bubble ? (
          <div className="giu-jiucu-bubble absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-[11px] font-bold text-giu-ink shadow-[0_4px_16px_rgba(60,42,33,0.12)] ring-1 ring-giu-border">
            {bubble}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-giu-border" aria-hidden />
          </div>
        ) : null}
        <div className={animated ? "giu-jiucu-3d-inner" : ""}>
          <JiucuSvg variant={variant} animated={animated} className={`${SIZE[size]} drop-shadow-[0_6px_12px_rgba(60,42,33,0.15)]`} />
        </div>
      </div>
      {caption ? (
        <p className="max-w-[220px] text-center text-[12px] font-semibold leading-snug text-giu-muted">{caption}</p>
      ) : null}
    </div>
  );
}
