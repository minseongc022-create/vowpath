/** Minimal SVG icons — Malhaeboka-style clean line icons */

type IconProps = { className?: string; active?: boolean };

export function IconHome({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 10.5L12 4l7 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-5.5H9V20.5H6.5A1.5 1.5 0 015 19v-8.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.12 : 0}
      />
    </svg>
  );
}

export function IconStats({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="13" width="4" height="7" rx="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="8" width="4" height="12" rx="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="16" y="4" width="4" height="16" rx="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconStudy({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3L3 7.5v9L12 21l9-4.5v-9L12 3z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.1 : 0}
      />
      <path d="M12 12l9-4.5M12 12v9M12 12L3 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBook({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4.5A2.5 2.5 0 017.5 2H18v18H7.5A2.5 2.5 0 005 17.5V4.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.1 : 0}
      />
      <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconReview({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4v5h5M20 20v-5h-5"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9.5A8 8 0 006.5 18M4 14.5A8 8 0 0117.5 6"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22c4-2.5 7-6.5 7-11 0-3.5-2-6-4-7.5C14 3.5 13 2 12 2S10 3.5 9 3.5C7 5 5 7.5 5 11c0 4.5 3 8.5 7 11z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 16c1.5-1 2.5-2.5 2.5-4.5S13 8 12 6.5 9.5 8.5 9.5 11.5 10.5 15 12 16z" fill="currentColor" />
    </svg>
  );
}
