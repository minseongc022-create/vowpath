type IconProps = { className?: string };

export function IconRankings({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M4 19V5M10 19V9M16 19v-6M22 19V3" />
    </svg>
  );
}

export function IconKeywords({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="M16 16l5 5" />
    </svg>
  );
}

export function IconCompetitors({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function IconSettlements({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path strokeLinecap="round" d="M3 10h18M7 15h4" />
    </svg>
  );
}

export function IconLink({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M10 14a3 3 0 010-4l2-2a3 3 0 014 0l1 1a3 3 0 010 4" />
      <path strokeLinecap="round" d="M14 10a3 3 0 010 4l-2 2a3 3 0 01-4 0l-1-1a3 3 0 010-4" />
    </svg>
  );
}
