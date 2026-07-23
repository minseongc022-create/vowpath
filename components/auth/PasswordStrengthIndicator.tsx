"use client";

import {
  evaluatePasswordPolicy,
  type PasswordStrengthLevel,
} from "@/lib/password-policy";

const LEVEL_STYLES: Record<
  Exclude<PasswordStrengthLevel, "empty">,
  { bar: string; text: string; width: string }
> = {
  weak: { bar: "bg-red-500", text: "text-red-700", width: "w-1/4" },
  fair: { bar: "bg-amber-500", text: "text-amber-800", width: "w-2/4" },
  good: { bar: "bg-lime-500", text: "text-lime-800", width: "w-3/4" },
  strong: { bar: "bg-emerald-600", text: "text-emerald-800", width: "w-full" },
};

type Props = {
  password: string;
  hint?: string;
};

export function PasswordStrengthIndicator({ password, hint }: Props) {
  const result = evaluatePasswordPolicy(password);
  const style =
    result.level === "empty" ? null : LEVEL_STYLES[result.level];

  return (
    <div className="mt-1.5 space-y-1.5" aria-live="polite">
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            style ? `${style.bar} ${style.width}` : "w-0"
          }`}
        />
      </div>
      {style && result.label ? (
        <p className={`text-xs font-medium ${style.text}`}>{result.label}</p>
      ) : null}
      {password ? (
        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
          <Check ok={result.checks.minLength} label="8+ characters" />
          <Check ok={result.checks.upper} label="Uppercase" />
          <Check ok={result.checks.lower} label="Lowercase" />
          <Check ok={result.checks.number} label="Number" />
          <Check ok={result.checks.special} label="Special (!@#…)" />
        </ul>
      ) : null}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-emerald-700" : "text-slate-500"}>
      <span aria-hidden>{ok ? "✓" : "○"} </span>
      {label}
    </li>
  );
}
