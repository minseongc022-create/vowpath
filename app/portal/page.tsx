import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";

export const metadata = {
  title: "Service request",
  description: "Complete or update your HVAC service request",
};

export default function PortalHomePage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-brand-50 px-6">
      <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Service request</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Open the link from your text message to complete or view your booking.
        </p>
        <p className="mt-4 text-xs text-slate-500">{copy.expiredBody}</p>
      </div>
    </main>
  );
}
