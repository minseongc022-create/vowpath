/** Canonical Effiroad AI mark — hex speech bubble with typing dots. Do not replace. */
export const EFFIROAD_AI_MARK_SRC = "/effiroad-ai-chat-mark.png";

type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
};

/** Renders the official Effiroad AI logo without cropping or overlays. */
export function EffiroadAiMark({ size = 40, className = "" }: EffiroadAiMarkProps) {
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
