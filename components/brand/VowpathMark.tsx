type VowpathMarkProps = {
  className?: string;
  size?: number;
  /** Unique id prefix when multiple marks render on one page */
  idPrefix?: string;
};

export function VowpathMark({ className = "", size = 32, idPrefix = "vow" }: VowpathMarkProps) {
  const grad = `${idPrefix}-mark-grad`;
  const glow = `${idPrefix}-mark-glow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={grad} x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7ec8ff" />
          <stop offset="0.45" stopColor="#3aa8f0" />
          <stop offset="1" stopColor="#0a5fad" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="35%" r="55%">
          <stop stopColor="#4aa8ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#4aa8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="22" r="20" fill={`url(#${glow})`} />
      <path
        d="M11 9 L24 40 L27.5 40 L15.5 11 Z"
        fill={`url(#${grad})`}
        opacity="0.92"
      />
      <path d="M18 9 L31 40 L34.5 40 L22.5 11 Z" fill={`url(#${grad})`} />
      <path
        d="M33 11 C36 8 39 6 42 5"
        stroke="#8fd4ff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M35 16 C38.5 13.5 41.5 11.5 44.5 10"
        stroke="#6bb8f0"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M37 21 C40 19 42.5 17 45 15.5"
        stroke="#4a9fd9"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
