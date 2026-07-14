type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
  showBadge?: boolean;
};

/** Effiroad-branded AI mark — warm road chevron + AI chip (not Gemini-style star). */
export function EffiroadAiMark({ size = 40, className = "", showBadge = true }: EffiroadAiMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #b59b78 0%, #9a7f5e 48%, #7d6348 100%)",
        boxShadow: "0 4px 14px rgb(125 99 72 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.22)",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="text-white"
        style={{ width: size * 0.52, height: size * 0.52 }}
        fill="none"
      >
        <path
          d="M5.5 17.5 12 6.5l6.5 11H5.5Z"
          fill="currentColor"
          fillOpacity={0.22}
        />
        <path
          d="M7.5 16 12 8.5 16.5 16H7.5Z"
          fill="currentColor"
        />
        <path
          d="M14.5 12.5h6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M17.5 10.5v4"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.85}
        />
      </svg>
      {showBadge ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-md bg-[#3d3228] font-bold uppercase tracking-tighter text-[#f5f0e8] ring-2 ring-white"
          style={{ fontSize: Math.max(7, size * 0.22), minWidth: size * 0.38, height: size * 0.32 }}
        >
          AI
        </span>
      ) : null}
    </span>
  );
}
