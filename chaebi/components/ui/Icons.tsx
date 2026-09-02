import type { NeedKind } from "@/chaebi/lib/types";

/**
 * 아이콘 — 전부 인라인 SVG.
 *
 * 아이콘 폰트나 외부 패키지를 쓰지 않는 이유: 첫 화면이 뜨는 속도가 이 앱의
 * 인상을 결정하는데, 아이콘 하나 때문에 폰트 파일을 기다릴 이유가 없다.
 * 전부 currentColor라 상태 색이 그대로 따라온다.
 */

type IconProps = { className?: string; strokeWidth?: number };

function base(className?: string) {
  return `h-5 w-5 ${className ?? ""}`.trim();
}

const COMMON = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function RestaurantIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M7 3v8a2 2 0 0 0 4 0V3" />
      <path d="M9 11v10" />
      <path d="M17 3c-1.6 1.2-2.4 3-2.4 5.2 0 1.6.7 2.6 2.4 2.8V21" />
    </svg>
  );
}

export function CakeIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M12 3.5c.9.9.9 1.8 0 2.6-.9-.8-.9-1.7 0-2.6Z" />
      <path d="M12 6.5v2.4" />
      <path d="M4.5 13.2c0-1.3 1-2.3 2.3-2.3h10.4c1.3 0 2.3 1 2.3 2.3v1.4c-1.6 0-1.6 1.4-3.2 1.4s-1.6-1.4-3.2-1.4-1.6 1.4-3.2 1.4-1.6-1.4-3.2-1.4-1.6 1.4-2.2 1.4Z" />
      <path d="M4.5 16.2V20h15v-3.8" />
    </svg>
  );
}

export function GiftIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M4 11.5h16V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5Z" />
      <path d="M3 8h18v3.5H3z" />
      <path d="M12 8v13" />
      <path d="M12 8S10.6 3.5 8.2 3.5A2.2 2.2 0 0 0 8.2 8H12Zm0 0s1.4-4.5 3.8-4.5a2.2 2.2 0 0 1 0 4.5H12Z" />
    </svg>
  );
}

export function FlowerIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <circle cx="12" cy="8.5" r="2.1" />
      <path d="M12 6.4c0-1.6-.7-2.9-2-2.9s-2 1.3-2 2.9c0 .8.5 1.5 1.3 1.9" />
      <path d="M12 6.4c0-1.6.7-2.9 2-2.9s2 1.3 2 2.9c0 .8-.5 1.5-1.3 1.9" />
      <path d="M10.2 9.9c-1.3.8-2.8.9-3.5-.2s0-2.5 1.4-3.3" />
      <path d="M13.8 9.9c1.3.8 2.8.9 3.5-.2s0-2.5-1.4-3.3" />
      <path d="M12 10.6V21" />
      <path d="M12 15.5c-1.6-1.7-3.4-1.9-4.6-1.4" />
      <path d="M12 18c1.6-1.7 3.4-1.9 4.6-1.4" />
    </svg>
  );
}

export function ActivityIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v1.7a1.8 1.8 0 0 0 0 3.6v1.7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5v-1.7a1.8 1.8 0 0 0 0-3.6V8.5Z" />
      <path d="M13.5 7v2M13.5 11.2v1.6M13.5 15v2" strokeDasharray="0.1 3" />
    </svg>
  );
}

export function PhotoIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.2l1.2-2h7.2l1.2 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
      <circle cx="12" cy="12.8" r="3.2" />
    </svg>
  );
}

export function TransportIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M4 16.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2M17 16.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2" />
      <path d="M3.5 16.5v-4l1.8-4.6A1.5 1.5 0 0 1 6.7 7h10.6a1.5 1.5 0 0 1 1.4 1l1.8 4.5v4Z" />
      <path d="M3.7 12.5h16.6" />
      <circle cx="7" cy="14.6" r=".9" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CheckIcon({ className, strokeWidth = 2.4 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    </svg>
  );
}

export function ChevronRightIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ChevronDownIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}

export function ArrowLeftIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </svg>
  );
}

export function CloseIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ClockIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function PinIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M12 21s6.5-5.6 6.5-10.2a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </svg>
  );
}

export function WalletIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M3.5 8.4A1.9 1.9 0 0 1 5.4 6.5h11.2a1.9 1.9 0 0 1 1.9 1.9v.6" />
      <path d="M3.5 8.4v8.2a1.9 1.9 0 0 0 1.9 1.9h13.2a1.9 1.9 0 0 0 1.9-1.9v-6a1.9 1.9 0 0 0-1.9-1.9H5.4" />
      <circle cx="16.8" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PeopleIcon({ className, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.8 19c.4-2.8 2.6-4.6 5.2-4.6s4.8 1.8 5.2 4.6" />
      <path d="M16 6.2a2.9 2.9 0 0 1 0 5.6M17.4 14.8c1.7.6 2.9 2.1 3.2 4.2" />
    </svg>
  );
}

export function SparkIcon({ className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 16.2 19.2 18.3 21.3 19 19.2 19.7 18.5 21.8 17.8 19.7 15.7 19 17.8 18.3 18.5 16.2Z" />
    </svg>
  );
}

export function SwapIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

export function AlertIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v5M12 16.1v.1" />
    </svg>
  );
}

export function ListIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...COMMON} strokeWidth={strokeWidth} className={base(className)}>
      <path d="M8.5 7h11M8.5 12h11M8.5 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
    </svg>
  );
}

export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base(className)} animate-spin`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.22" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NEED_ICONS: Record<NeedKind, (props: IconProps) => React.JSX.Element> = {
  restaurant: RestaurantIcon,
  cake: CakeIcon,
  gift: GiftIcon,
  flower: FlowerIcon,
  activity: ActivityIcon,
  photo: PhotoIcon,
  transport: TransportIcon,
};

export function NeedIcon({ need, className }: { need: NeedKind; className?: string }) {
  const Icon = NEED_ICONS[need] ?? SparkIcon;
  return <Icon className={className} />;
}
