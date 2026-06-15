import { LinkIntakeForm } from "@/components/intake/LinkIntakeForm";
import { LinkIntakePortal } from "@/components/intake/LinkIntakePortal";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import {
  canSubmitLinkIntakeForm,
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
  isLinkIntakeSessionExpired,
} from "@/lib/call-intake/link-intake-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getLinkIntakeSession(token);
  const shopName = session?.shopName?.trim();
  return {
    title: shopName ? `${shopName} · Service request` : "Service request | Vowpath",
    description: copy.formDescription,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f6f8fc",
};

export default async function LinkIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getLinkIntakeSession(token);

  if (!session || isLinkIntakeSessionExpired(session)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fc] px-6">
        <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{copy.expiredTitle}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.expiredBody}</p>
        </div>
      </main>
    );
  }

  const shopName =
    session.shopName?.trim() || (await shopDisplayNameForUser(session.userId));

  if (canSubmitLinkIntakeForm(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakeForm token={token} shopName={shopName} />
      </main>
    );
  }

  if (isLinkIntakePortalOpen(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakePortal token={token} shopName={shopName} />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fc] px-6">
      <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{copy.expiredTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.expiredBody}</p>
      </div>
    </main>
  );
}
