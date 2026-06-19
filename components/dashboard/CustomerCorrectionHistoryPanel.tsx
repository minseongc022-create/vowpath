import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";

const FIELD_LABEL: Record<string, string> = {
  customerName: "Customer name",
  address: "Address",
  issueType: "Requested service",
};

function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerCorrectionHistoryPanel({
  record,
}: {
  record: CustomerVerificationRecord | null;
}) {
  const corrections = record?.corrections ?? [];

  return (
    <section className="booking-detail-card overflow-hidden">
      <div className="border-b border-brand-200/60 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-brand-950">Customer Correction History</h2>
        <p className="mt-1 text-xs text-stone-500">
          Original and updated values submitted by the customer.
        </p>
      </div>
      <div className="px-4 py-4 sm:px-5">
        {corrections.length > 0 ? (
          <ul className="space-y-3">
            {corrections.map((change, index) => (
              <li
                key={`${change.field}-${change.submittedAt}-${index}`}
                className="rounded-xl border border-brand-200/70 bg-stone-50/80 p-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-brand-950">
                    {FIELD_LABEL[change.field] ?? change.field}
                  </p>
                  <time className="text-xs text-stone-500">
                    {formatSubmittedAt(change.submittedAt)}
                  </time>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Original
                    </p>
                    <p className="mt-1 text-sm text-stone-700">
                      {change.originalValue || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-900">
                      {change.updatedValue || "Unknown"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-brand-200/70 bg-stone-50/80 p-3 text-sm text-stone-600">
            No customer corrections recorded.
          </p>
        )}
      </div>
    </section>
  );
}
