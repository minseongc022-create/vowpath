import { LinkIntakeForm } from "@/components/intake/LinkIntakeForm";
import { LinkIntakePortal } from "@/components/intake/LinkIntakePortal";
import { CustomerBookingPortal } from "@/components/intake/CustomerBookingPortal";
import { LinkIntakeCopyProvider } from "@/components/intake/LinkIntakeCopyContext";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { loadCustomerBookingPortalView } from "@/lib/customer-booking-portal";
import {
  canSubmitLinkIntakeForm,
  isLinkIntakePortalOpen,
  isLinkIntakeSessionExpired,
} from "@/lib/call-intake/link-intake-store";
import {
  LinkIntakeSessionLookupError,
  loadLinkIntakeSession,
} from "@/lib/link-intake-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  try {
    const { session } = await loadLinkIntakeSession(rawToken);
    const shopName = session
      ? await shopDisplayNameForUser(session.userId)
      : undefined;
    return {
      title: shopName ? `${shopName} · Your visit` : "Your visit",
      description: copy.bookingPortalTitle,
    };
  } catch {
    return {
      title: "Your visit",
      description: copy.bookingPortalTitle,
    };
  }
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
  const { token: rawToken } = await params;
  let token: string;
  let session;
  try {
    ({ token, session } = await loadLinkIntakeSession(rawToken));
  } catch (e) {
    if (e instanceof LinkIntakeSessionLookupError) {
      return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-brand-50 px-6">
          <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{copy.unavailableTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.unavailableBody}</p>
          </div>
        </main>
      );
    }
    throw e;
  }

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
        <LinkIntakeCopyProvider>
          <LinkIntakeForm token={token} shopName={shopName} />
        </LinkIntakeCopyProvider>
      </main>
    );
  }

  if (isLinkIntakePortalOpen(session) && session.callId) {
    const booking = await loadCustomerBookingPortalView({ session, token });
    if (booking) {
      return (
        <main className="min-h-[100dvh]">
          <LinkIntakeCopyProvider>
            <CustomerBookingPortal token={token} shopName={shopName} initialBooking={booking} />
          </LinkIntakeCopyProvider>
        </main>
      );
    }
  }

  if (isLinkIntakePortalOpen(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakeCopyProvider>
          <LinkIntakePortal token={token} shopName={shopName} />
        </LinkIntakeCopyProvider>
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
