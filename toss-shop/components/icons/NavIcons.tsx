type IconProps = { active?: boolean; className?: string };

const stroke = (active?: boolean) => (active ? "#3282f6" : "#6b7684");

export function IconHome({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
    </svg>
  );
}

export function IconDiscovery({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M12 3l1.8 5.5H20l-4.6 3.3 1.8 5.5L12 14l-5.2 3.3 1.8-5.5L4 8.5h6.2L12 3z" />
    </svg>
  );
}

export function IconKeywords({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="M16 16l5 5" />
    </svg>
  );
}

export function IconRankings({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M5 19V9M12 19V5M19 19v-7" />
    </svg>
  );
}

export function IconSettlements({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path strokeLinecap="round" d="M3 10h18M7 15h4" />
    </svg>
  );
}

export function IconCompetitors({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path strokeLinecap="round" d="M3 19c0-3 2.7-5 6-5s6 2 6 5M13 19c0-2.2 1.8-4 4-4" />
    </svg>
  );
}

export function IconMore({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <circle cx="6" cy="12" r="1.5" fill={stroke(active)} stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill={stroke(active)} stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill={stroke(active)} stroke="none" />
    </svg>
  );
}

export function IconSettings({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

export function IconConsignment({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M4 8h16v12H4zM8 8V5h8v3" />
      <path strokeLinecap="round" d="M12 12v4M10 14h4" />
    </svg>
  );
}

export function IconImport({ active, className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3 12h18M12 3c2 2.5 3 5 3 9s-1 6.5-3 9" />
    </svg>
  );
}
