"use client";

import { useId } from "react";

type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
};

/** Professional AI badge — sparkle + AI label, no custom image logo. */
export function EffiroadAiMark({ size = 40, className = "" }: EffiroadAiMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `effi-ai-grad-${uid}`;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
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
      >
        <defs>
          <linearGradient id={gradId} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8dcc8" />
            <stop offset="0.4" stopColor="#b59b78" />
            <stop offset="1" stopColor="#6f563d" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={`url(#${gradId})`} />
        <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.4)" strokeWidth="1.25" />
        <circle cx="24" cy="24" r="21" stroke="rgba(61,50,40,0.12)" strokeWidth="0.75" />
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
