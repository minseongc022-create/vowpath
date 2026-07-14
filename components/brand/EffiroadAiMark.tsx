import { IconEffiroadAi } from "@/components/dashboard/DashboardNavIcons";

type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
  showBadge?: boolean;
};

/** Effiroad AI mark — crisp SVG (no broken PNG). */
export function EffiroadAiMark({ size = 40, className = "", showBadge = true }: EffiroadAiMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#b59b78] to-[#7d6348] shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <IconEffiroadAi className="h-[62%] w-[62%] text-white" />
      {showBadge ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-md bg-[#3d3228] font-bold uppercase tracking-tighter text-[#f5f0e8] ring-2 ring-white"
          style={{ fontSize: Math.max(7, size * 0.2), minWidth: size * 0.36, height: size * 0.3 }}
        >
          AI
        </span>
      ) : null}
    </span>
  );
}
