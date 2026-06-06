import { dashboardUi } from "@/lib/content";
import type {
  RequestVerificationItem,
  RequestVerificationStatus,
  VerificationItemState,
} from "@/lib/request-verification-status";

const t = dashboardUi.bookingDetail;

const STATE_STYLES: Record<
  VerificationItemState,
  { icon: string; label: string; row: string; hint: string }
> = {
  verified: {
    icon: "text-emerald-400",
    label: "text-emerald-200",
    row: "border-emerald-500/20 bg-emerald-500/[0.06]",
    hint: "text-emerald-400/80",
  },
  not_verified: {
    icon: "text-slate-500",
    label: "text-slate-400",
    row: "border-white/[0.06] bg-white/[0.02]",
    hint: "text-slate-500",
  },
  failed: {
    icon: "text-rose-400",
    label: "text-rose-200",
    row: "border-rose-500/20 bg-rose-500/[0.06]",
    hint: "text-rose-400/80",
  },
};

function StatusIcon({ state }: { state: VerificationItemState }) {
  const className = `h-5 w-5 shrink-0 ${STATE_STYLES[state].icon}`;
  if (state === "verified") {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (state === "failed") {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M7 10h6" />
    </svg>
  );
}

function VerificationRow({ item }: { item: RequestVerificationItem }) {
  const styles = STATE_STYLES[item.state];
  return (
    <li className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${styles.row}`}>
      <StatusIcon state={item.state} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${styles.label}`}>{item.label}</p>
        {item.hint ? <p className={`text-xs ${styles.hint}`}>{item.hint}</p> : null}
      </div>
    </li>
  );
}

type VerificationStatusPanelProps = {
  verification: RequestVerificationStatus;
};

export function VerificationStatusPanel({ verification }: VerificationStatusPanelProps) {
  return (
    <section className="booking-detail-card overflow-visible rounded-2xl border border-white/[0.06] bg-[#161b22] bg-none shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-white">{t.verificationTitle}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {verification.hasLinkedCall ? t.verificationLinked : t.verificationUnlinked}
        </p>
      </div>
      <ul className="space-y-2 px-5 py-4 sm:px-6">
        {verification.items.map((item) => (
          <VerificationRow key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}
