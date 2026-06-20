import { LinkIntakeForm } from "@/components/intake/LinkIntakeForm";
import { LinkIntakePortal } from "@/components/intake/LinkIntakePortal";
import { CustomerBookingPortal } from "@/components/intake/CustomerBookingPortal";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { loadCustomerBookingPortalView } from "@/lib/customer-booking-portal";
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
  const shopName = session
    ? await shopDisplayNameForUser(session.userId)
    : undefined;
  return {
    title: shopName ? `${shopName} · Your booking` : "Your booking | Vowpath",
    description: copy.bookingPortalTitle,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf8f5",
};

export default async function ShortBookingPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getLinkIntakeSession(token);

  if (!session || isLinkIntakeSessionExpired(session)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-brand-50 px-6">
        <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{copy.expiredTitle}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.expiredBody}</p>
        </div>
      </main>
    );
  }

  const shopName = await shopDisplayNameForUser(session.userId);

  if (canSubmitLinkIntakeForm(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakeForm token={token} shopName={shopName} />
      </main>
    );
  }

  if (isLinkIntakePortalOpen(session) && session.callId) {
    const booking = await loadCustomerBookingPortalView({ session, token });
    if (booking) {
      return (
        <main className="min-h-[100dvh]">
          <CustomerBookingPortal token={token} shopName={shopName} initialBooking={booking} />
        </main>
      );
    }
  }

  if (isLinkIntakePortalOpen(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakePortal token={token} shopName={shopName} />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-brand-50 px-6">
      <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{copy.expiredTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.expiredBody}</p>
      </div>
    </main>
  );
}
