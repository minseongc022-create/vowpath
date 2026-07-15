"use client";

import { useId } from "react";

type EffiroadAiMarkProps = {
  size?: number;
  /** Optional shadow on the circular badge (applied to round wrapper, not square SVG). */
  shadow?: "none" | "sm" | "md" | "lg";
};

const SHADOW: Record<NonNullable<EffiroadAiMarkProps["shadow"]>, string> = {
  none: "",
  sm: "shadow-[0_2px_8px_rgb(61_50_40_/_0.18)]",
  md: "shadow-[0_4px_14px_rgb(61_50_40_/_0.24)]",
  lg: "shadow-[0_6px_20px_rgb(61_50_40_/_0.28)]",
};

/** Professional AI badge — sparkle + AI label, no square halo from SVG drop-shadow. */
export function EffiroadAiMark({ size = 40, shadow = "md" }: EffiroadAiMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `effi-ai-grad-${uid}`;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SHADOW[shadow]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
        className="block"
      >
        <defs>
          <linearGradient id={gradId} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8dcc8" />
            <stop offset="0.4" stopColor="#b59b78" />
            <stop offset="1" stopColor="#6f563d" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={`url(#${gradId})`} />
        <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <path
          d="M24 12.2 25.55 17h4.75l-3.85 2.8 1.47 4.52L24 21.52l-3.92 2.8 1.47-4.52-3.85-2.8h4.75L24 12.2Z"
          fill="white"
        />
        <path
          d="M33.8 14.6 34.35 16.1l1.5.55-1.5.55-.55 1.5-.55-1.5-1.5-.55 1.5-.55.55-1.5Z"
          fill="white"
          fillOpacity="0.85"
        />
        <text
          x="24"
          y="36.5"
          textAnchor="middle"
          fill="white"
          fontSize="11.5"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          letterSpacing="0.08em"
        >
          AI
        </text>
      </svg>
    </span>
  );
}
