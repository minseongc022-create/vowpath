type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
  showBadge?: boolean;
};

/** Effiroad AI mark — brand 3D logo image with optional AI chip. */
export function EffiroadAiMark({ size = 40, className = "", showBadge = true }: EffiroadAiMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f5f0e8] ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/effiroad-ai-mark.png"
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
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
