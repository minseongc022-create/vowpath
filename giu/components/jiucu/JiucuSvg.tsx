/** Inline SVG mascot for Jiucu (지우쿠) — GIUCUU app character. */
export type JiucuVariant =
  | "default"
  | "excited"
  | "curious"
  | "search"
  | "shop"
  | "enjoy";

type Props = {
  variant?: JiucuVariant;
  className?: string;
  /** Antenna wiggle when parent has .giu-jiucu-animated */
  animated?: boolean;
};

const BROWN = "#3C2A21";
const GOLD = "#F9A825";
const ORANGE = "#E87722";
const TAG = "#F07828";

function Body({ wink, hideAntenna }: { wink?: boolean; hideAntenna?: boolean }) {
  return (
    <>
      <rect x="28" y="38" width="44" height="44" rx="14" fill="#fff" stroke={BROWN} strokeWidth="2.5" />
      {!hideAntenna ? (
        <>
          <line x1="50" y1="38" x2="50" y2="26" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="22" r="5" fill={GOLD} stroke={BROWN} strokeWidth="1.5" />
        </>
      ) : null}
      {wink ? (
        <>
          <path d="M38 54 Q42 50 46 54" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="62" cy="52" r="3" fill={BROWN} />
        </>
      ) : (
        <>
          <circle cx="40" cy="52" r="3" fill={BROWN} />
          <circle cx="60" cy="52" r="3" fill={BROWN} />
        </>
      )}
      <path d="M42 62 Q50 68 58 62" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path
        d="M34 72 h32 v14 a6 6 0 0 1-6 6 H40 a6 6 0 0 1-6-6 V72 z"
        fill={BROWN}
      />
      <text x="50" y="84" textAnchor="middle" fontSize="11" fontWeight="800" fill={GOLD} fontFamily="system-ui,sans-serif">
        g
      </text>
      <ellipse cx="38" cy="94" rx="7" ry="4" fill={ORANGE} />
      <ellipse cx="62" cy="94" rx="7" ry="4" fill={ORANGE} />
      <g transform="translate(68 70) rotate(12)">
        <rect x="0" y="0" width="14" height="18" rx="3" fill={TAG} stroke={BROWN} strokeWidth="1.5" />
        <circle cx="7" cy="-2" r="2.5" fill={GOLD} stroke={BROWN} strokeWidth="1" />
        <text x="7" y="13" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="system-ui,sans-serif">
          %
        </text>
      </g>
    </>
  );
}

function VariantOverlay({ variant }: { variant: JiucuVariant }) {
  switch (variant) {
    case "excited":
      return (
        <>
          <circle cx="40" cy="52" r="3" fill={BROWN} />
          <circle cx="60" cy="52" r="3" fill={BROWN} />
          <path d="M42 62 Q50 70 58 62" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="22" cy="48" r="6" fill="#fff" stroke={BROWN} strokeWidth="2" />
          <circle cx="78" cy="48" r="6" fill="#fff" stroke={BROWN} strokeWidth="2" />
          <path d="M18 44 l4 8 M26 44 l-4 8" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
          <path d="M74 44 l4 8 M82 44 l-4 8" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "curious":
      return (
        <>
          <circle cx="40" cy="52" r="3.5" fill={BROWN} />
          <circle cx="60" cy="52" r="3.5" fill={BROWN} />
          <path d="M46 64 h8" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="72" cy="58" r="7" fill="#fff" stroke={BROWN} strokeWidth="2" />
          <path d="M72 54 v4 M70 56 h4" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
          <text x="50" y="18" textAnchor="middle" fontSize="14" fontWeight="800" fill={GOLD}>
            ?
          </text>
        </>
      );
    case "search":
      return (
        <>
          <circle cx="40" cy="52" r="3" fill={BROWN} />
          <path d="M38 54 Q42 50 46 54" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <g transform="translate(62 68)">
            <circle cx="0" cy="0" r="9" fill="none" stroke={BROWN} strokeWidth="3" />
            <line x1="6" y1="6" x2="14" y2="14" stroke={BROWN} strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="-2" cy="4" rx="5" ry="3" fill={GOLD} transform="rotate(-20)" />
          </g>
        </>
      );
    case "shop":
      return (
        <>
          <path d="M38 54 Q42 50 46 54" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="60" cy="52" r="3" fill={BROWN} />
          <g transform="translate(14 62)">
            <path d="M4 8 L8 0 L24 0 L28 8 Z" fill={BROWN} />
            <rect x="2" y="8" width="28" height="22" rx="4" fill="#fff" stroke={BROWN} strokeWidth="2" />
            <text x="16" y="22" textAnchor="middle" fontSize="10" fontWeight="800" fill={GOLD}>
              g
            </text>
          </g>
        </>
      );
    case "enjoy":
      return (
        <>
          <path d="M38 52 Q40 48 42 52" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M58 52 Q60 48 62 52" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M42 64 Q50 72 58 64" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <g transform="translate(68 58)">
            <rect x="0" y="6" width="22" height="16" rx="3" fill="#D4A574" stroke={BROWN} strokeWidth="1.5" />
            <ellipse cx="6" cy="2" rx="4" ry="3" fill={GOLD} />
            <ellipse cx="14" cy="0" rx="5" ry="4" fill="#C4884A" />
            <ellipse cx="20" cy="3" rx="3" ry="2.5" fill={GOLD} />
          </g>
        </>
      );
    default:
      return (
        <>
          <circle cx="22" cy="58" r="7" fill="#fff" stroke={BROWN} strokeWidth="2" />
          <path d="M22 54 l0 6 M19 57 l6 0" stroke={BROWN} strokeWidth="2" strokeLinecap="round" />
        </>
      );
  }
}

export function JiucuSvg({ variant = "default", className, animated }: Props) {
  const showDefaultBody = variant !== "excited" && variant !== "curious";
  const wink = variant === "default" || variant === "search" || variant === "shop";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="지우쿠"
    >
      {animated ? (
        <g className="giu-jiucu-antenna">
          <line x1="50" y1="38" x2="50" y2="26" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="22" r="5" fill={GOLD} stroke={BROWN} strokeWidth="1.5" />
        </g>
      ) : null}
      {showDefaultBody ? <Body wink={wink} hideAntenna={animated} /> : null}
      {variant === "excited" || variant === "curious" ? (
        <>
          <rect x="28" y="38" width="44" height="44" rx="14" fill="#fff" stroke={BROWN} strokeWidth="2.5" />
          {!animated ? (
            <>
              <line x1="50" y1="38" x2="50" y2="26" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="22" r="5" fill={GOLD} stroke={BROWN} strokeWidth="1.5" />
            </>
          ) : null}
          <path
            d="M34 72 h32 v14 a6 6 0 0 1-6 6 H40 a6 6 0 0 1-6-6 V72 z"
            fill={BROWN}
          />
          <text x="50" y="84" textAnchor="middle" fontSize="11" fontWeight="800" fill={GOLD} fontFamily="system-ui,sans-serif">
            g
          </text>
          <ellipse cx="38" cy="94" rx="7" ry="4" fill={ORANGE} />
          <ellipse cx="62" cy="94" rx="7" ry="4" fill={ORANGE} />
        </>
      ) : null}
      <VariantOverlay variant={variant} />
    </svg>
  );
}
