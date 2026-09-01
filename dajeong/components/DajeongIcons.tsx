import type { SVGProps } from "react";
import type { PlanCategory } from "../lib/types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 22, children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></IconBase>;
}

export function SparkleIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 3 1.25 4.1A5.4 5.4 0 0 0 16.9 10L21 11.2l-4.1 1.25A5.4 5.4 0 0 0 13.25 16L12 20.2 10.75 16a5.4 5.4 0 0 0-3.65-3.55L3 11.2 7.1 10a5.4 5.4 0 0 0 3.65-2.9L12 3Z" /></IconBase>;
}

export function ArrowIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14M14 7l5 5-5 5" /></IconBase>;
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>;
}

export function ClockIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>;
}

export function MapPinIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></IconBase>;
}

export function WalletIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 6.5h14a2 2 0 0 1 2 2V18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /></IconBase>;
}

export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></IconBase>;
}

export function ChevronIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 7 5 5-5 5" /></IconBase>;
}

export function RefreshIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.4 9A7 7 0 0 0 6.2 6.2L4 8M5.6 15A7 7 0 0 0 17.8 17.8L20 16" /></IconBase>;
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></IconBase>;
}

export function CategoryIcon({ category, ...props }: IconProps & { category: PlanCategory }) {
  if (category === "activity") return <IconBase {...props}><path d="M4 19 9.5 6l4 8 2-4 4.5 9H4Z" /><circle cx="16.5" cy="5.5" r="2.5" /></IconBase>;
  if (category === "cafe") return <IconBase {...props}><path d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" /><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v2M12 3v2" /></IconBase>;
  if (category === "meal") return <IconBase {...props}><path d="M6 3v8M3.5 3v5a2.5 2.5 0 0 0 5 0V3M6 11v10M15 3v18M15 3c4 2 4 8 0 10" /></IconBase>;
  if (category === "view") return <IconBase {...props}><path d="M3 18h18M5 18V9l5-4v13M10 18V8l5 3v7M15 18V6h4v12" /><path d="M4 4h1M19 3h1M20 8h1" /></IconBase>;
  if (category === "lodging") return <IconBase {...props}><path d="M4 20V8h16v12M4 15h16M7 12h3M14 12h3M3 20h18" /><path d="M7 8V5h10v3" /></IconBase>;
  if (category === "cake") return <IconBase {...props}><path d="M4 10h16v11H4zM3 14h18M8 10V7M12 10V5M16 10V7" /><path d="M7 4c1-2 2-2 2 0M11 2c1-2 2-2 2 0M15 4c1-2 2-2 2 0" /></IconBase>;
  if (category === "flower") return <IconBase {...props}><path d="M12 12v9M12 17c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 15c3 0 5-2 5-5-3 0-5 2-5 5Z" /><circle cx="12" cy="7" r="2.5" /><circle cx="8.5" cy="7" r="2.5" /><circle cx="10" cy="4" r="2.5" /><circle cx="14" cy="4" r="2.5" /><circle cx="15.5" cy="7" r="2.5" /></IconBase>;
  if (category === "gift") return <IconBase {...props}><path d="M4 10h16v11H4zM3 7h18v4H3zM12 7v14" /><path d="M12 7H8.5a2.5 2.5 0 1 1 2.5-2.5V7ZM12 7h3.5A2.5 2.5 0 1 0 13 4.5V7Z" /></IconBase>;
  return <HeartIcon {...props} />;
}
