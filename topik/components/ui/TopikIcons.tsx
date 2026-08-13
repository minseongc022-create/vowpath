/** Line icons — consistent with bottom nav (Malhaeboka style) */

import type { StudyMode, StudyModeId } from "@/topik/lib/study-modes";

type IconProps = { className?: string; active?: boolean; size?: number };

const stroke = (active?: boolean) => (active ? 2.2 : 1.8);

export function IconHome({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 10.5L12 4l7 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-5.5H9V20.5H6.5A1.5 1.5 0 015 19v-8.5z"
        stroke="currentColor"
        strokeWidth={stroke(active)}
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
      <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={stroke(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={stroke(active)} />
      <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={stroke(active)} />
      <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth={stroke(active)} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
    </svg>
  );
}

export function IconBook({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4.5A2.5 2.5 0 017.5 2H18v18H7.5A2.5 2.5 0 005 17.5V4.5z"
        stroke="currentColor"
        strokeWidth={stroke(active)}
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
      <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9.5A8 8 0 006.5 18M4 14.5A8 8 0 0117.5 6" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" />
    </svg>
  );
}

export function IconMic({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 11a6 6 0 0012 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconPen({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconClipboard({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="4" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconMonitor({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBooks({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 5h7v14H5a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 5h7a1 1 0 011 1v12a1 1 0 01-1 1h-7V5z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h1M16 9h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconNotebook({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h12v18H6a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconReading({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconGrammar({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h8M8 10h5M8 14h8M8 18h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconVocab({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 8h12M9 4v16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconCheckCircle({ className, size = 40 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInbox({ className, size = 40 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 8l2-4h12l2 4M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSparkle({ className, size = 40 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
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

export function IconPerson({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconChat({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeadphones({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 14v-2a8 8 0 0116 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="2" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="18" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconGear({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconLeague({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 20h12M8 20V10l4-4 4 4v10" stroke="currentColor" strokeWidth={stroke(active)} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0} />
      <path d="M5 10h14M12 6v14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconPremium({ className, active }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 8l2 12h10l2-12-3 2-4-5-4 5-3-2z" stroke="currentColor" strokeWidth={stroke(active)} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
    </svg>
  );
}

export function IconTrophy({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v3a4 4 0 01-8 0V4zM6 4H4v1a3 3 0 003 3M18 4h2v1a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 11v3M9 20h6M10 14h4v3H10v-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function IconKeyboard({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSpeaker({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 6L6 10H3v4h3l5 4V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 010 6M18.5 6.5a7 7 0 010 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className, size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4a5 5 0 00-5 5v3l-1.5 2.5h13L17 12V9a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export function IconRecord({ className, size = 18 }: IconProps) {
  return <IconMic className={className} size={size} />;
}

const MODE_ICONS: Record<StudyModeId, React.ComponentType<IconProps>> = {
  speaking: IconMic,
  writing: IconPen,
  practice: IconClipboard,
  "mock-exam": IconMonitor,
  lessons: IconBooks,
  review: IconReview,
  "wrong-notes": IconNotebook,
};

type StudyModeTint = StudyMode["tint"];

const TINT_CLASS: Record<StudyModeTint, string> = {
  primary: "topik-mode-icon-primary",
  coral: "topik-mode-icon-coral",
  mint: "topik-mode-icon-mint",
  blue: "topik-mode-icon-blue",
  gold: "topik-mode-icon-gold",
};

export function StudyModeIcon({
  id,
  tint,
  size = 22,
  compact,
}: {
  id: StudyModeId;
  tint?: StudyMode["tint"];
  size?: number;
  compact?: boolean;
}) {
  const Icon = MODE_ICONS[id];
  const tintClass = tint ? TINT_CLASS[tint] : TINT_CLASS.primary;
  return (
    <span className={`topik-mode-icon ${tintClass} ${compact ? "topik-mode-icon-sm" : ""}`}>
      <Icon size={compact ? 18 : size} />
    </span>
  );
}
