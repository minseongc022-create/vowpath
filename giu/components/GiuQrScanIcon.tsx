type Props = {
  className?: string;
};

/** QR scan frame icon (corner brackets + finder pattern). */
export function GiuQrScanIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="7" y="7" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="14" y="7" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="14" y="14" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="11" y="11" width="2" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}
