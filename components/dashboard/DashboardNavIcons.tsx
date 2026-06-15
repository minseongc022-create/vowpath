type IconProps = { className?: string };

export function IconDashboard({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  );
}

export function IconRequests({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconBriefing({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L15 3.586A2 2 0 0013.586 3H4zm2 5a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h5a1 1 0 100-2H6z" />
    </svg>
  );
}

export function IconVowpathAi({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.052.443a1 1 0 01.554 1.705l-2.209 2.153.522 3.04a1 1 0 01-1.451 1.054L10 12.27l-2.744 1.442a1 1 0 01-1.45-1.054l.521-3.04-2.209-2.153A1 1 0 014.672 5.76l3.052-.443 1.382-2.764A1 1 0 0110 2z" />
      <path d="M4 16a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
    </svg>
  );
}

export function IconMissedCalls({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      <path d="M15.707 2.293a1 1 0 010 1.414L14.414 5l1.293 1.293a1 1 0 11-1.414 1.414L13 6.414l-1.293 1.293a1 1 0 01-1.414-1.414L11.586 5l-1.293-1.293a1 1 0 011.414-1.414L13 3.586l1.293-1.293z" />
    </svg>
  );
}

export function IconSettings({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconCalendar({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-2 0v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V2a1 1 0 10-2 0v1H7V2a1 1 0 00-1-1zm2 5a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconDiamond({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2l2.5 4h5l-4 6.5L10 18l-3.5-5.5L2.5 6h5L10 2z" />
    </svg>
  );
}
