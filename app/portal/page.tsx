import { getLinkIntakeCopy } from "@/lib/link-intake-copy";

const copy = getLinkIntakeCopy("en");

export const metadata = {
  title: "Customer portal",
  description: "Open the link from your text message to report details or check your request",
};

export default function PortalHomePage() {
  return (
    <main className="vow-app-px flex min-h-[100dvh] items-center justify-center bg-brand-50">
      <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{copy.portalLandingTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.portalLandingBody}</p>
        <p className="mt-4 text-xs text-slate-500">{copy.expiredBody}</p>
      </div>
    </main>
  );
}
