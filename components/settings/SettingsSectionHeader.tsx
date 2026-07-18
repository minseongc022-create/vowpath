import type { ReactNode } from "react";

type SettingsSectionHeaderProps = {
  icon: string;
  eyebrow?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
};

export function SettingsSectionHeader({
  icon,
  eyebrow,
  title,
  hint,
  action,
  className = "",
}: SettingsSectionHeaderProps) {
  return (
    <div className={`flex gap-2.5 sm:gap-4 ${className}`}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg shadow-sm ring-1 ring-brand-200/80 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="vow-settings-eyebrow">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-brand-950 sm:text-2xl">{title}</h2>
          {action}
        </div>
        {hint ? <p className="vow-settings-hint mt-1 sm:mt-2">{hint}</p> : null}
      </div>
    </div>
  );
}

type SettingsSubsectionProps = {
  icon?: string;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSubsection({
  icon,
  title,
  hint,
  children,
  className = "",
}: SettingsSubsectionProps) {
  return (
    <div className={`vow-settings-user-zone ${className}`}>
      <div className="flex gap-3">
        {icon ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm ring-1 ring-brand-200/60"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="vow-settings-label">{title}</p>
          {hint ? <p className="vow-settings-hint mt-1">{hint}</p> : null}
        </div>
      </div>
      <div className={icon ? "mt-4" : "mt-3"}>{children}</div>
    </div>
  );
}

/** Emoji prefix for booking policy bullets */
export const BOOKING_RULE_ICONS = ["✅", "🚨", "❓", "↩️"] as const;
