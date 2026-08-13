/** Placeholder mascot — tiger in hanbok style (simple SVG) */

export function MascotCharacter({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 100"
      fill="none"
      aria-hidden
      role="img"
    >
      {/* Horse body */}
      <ellipse cx="75" cy="72" rx="22" ry="12" fill="#c4a574" />
      <ellipse cx="88" cy="68" rx="8" ry="6" fill="#b8956a" />
      {/* Horse legs */}
      <rect x="62" y="78" width="4" height="14" rx="2" fill="#a08050" />
      <rect x="72" y="80" width="4" height="12" rx="2" fill="#a08050" />
      <rect x="82" y="78" width="4" height="14" rx="2" fill="#a08050" />
      {/* Character body */}
      <ellipse cx="48" cy="55" rx="18" ry="22" fill="#2d2d2d" />
      {/* Hanbok */}
      <path d="M32 58 Q48 72 64 58 L64 78 Q48 88 32 78 Z" fill="#c94c55" />
      <path d="M38 58 L48 68 L58 58" stroke="#d4a017" strokeWidth="2" fill="none" />
      {/* Head */}
      <circle cx="48" cy="38" r="16" fill="#2d2d2d" />
      {/* Ears */}
      <polygon points="36,28 34,18 42,26" fill="#2d2d2d" />
      <polygon points="60,28 62,18 54,26" fill="#2d2d2d" />
      {/* Face */}
      <ellipse cx="42" cy="38" rx="3" ry="4" fill="#fff" />
      <ellipse cx="54" cy="38" rx="3" ry="4" fill="#fff" />
      <circle cx="42" cy="39" r="1.5" fill="#2d2d2d" />
      <circle cx="54" cy="39" r="1.5" fill="#2d2d2d" />
      <ellipse cx="48" cy="44" rx="2" ry="1" fill="#d97070" />
      {/* Hat */}
      <ellipse cx="48" cy="24" rx="14" ry="4" fill="#1a1a1a" />
      <rect x="34" y="20" width="28" height="6" rx="2" fill="#1a1a1a" />
      <circle cx="48" cy="22" r="3" fill="#d4a017" />
    </svg>
  );
}
