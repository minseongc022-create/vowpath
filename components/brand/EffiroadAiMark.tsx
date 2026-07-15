/** Single canonical Effiroad AI app icon — circular hex speech-bubble mark, same asset everywhere. */
export const EFFIROAD_AI_ICON_SRC = "/effiroad-ai-icon.png?v=1";

type EffiroadAiMarkProps = {
  size?: number;
  className?: string;
};

export function EffiroadAiMark({ size = 40, className = "" }: EffiroadAiMarkProps) {
  return (
    <img
      src={EFFIROAD_AI_ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
