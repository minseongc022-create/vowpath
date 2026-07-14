/** Transparent mark for dark surfaces (sidebar, headers). */
export const EFFIROAD_AI_MARK_SRC = "/effiroad-ai-chat-mark.png?v=6";
/** Full reference art with beige backing — clipped to a circle for FAB / mobile orb. */
export const EFFIROAD_AI_MARK_ORB_SRC = "/brand-sources/effiroad-ai-chat-mark-source.png?v=1";

type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
  /** plain = transparent logo; orb = circular app-icon (exact reference art, round clip). */
  variant?: "plain" | "orb";
};

/** Official Effiroad AI logo — same design everywhere; orb uses circular app-icon framing. */
export function EffiroadAiMark({
  size = 40,
  className = "",
  variant = "plain",
}: EffiroadAiMarkProps) {
  if (variant === "orb") {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-white/95 bg-[#e8cdb0] shadow-[0_4px_20px_rgb(61_50_40_/_0.26),0_2px_8px_rgb(61_50_40_/_0.14)] ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={EFFIROAD_AI_MARK_ORB_SRC}
          alt=""
          width={size}
          height={size}
          className="h-full w-full scale-[1.06] object-cover"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={EFFIROAD_AI_MARK_SRC}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
