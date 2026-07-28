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
  isLinkIntakeTenantActive,
  loadLinkIntakeSession,
} from "@/lib/link-intake-page";
import { isLikelyTruncatedLinkToken } from "@/lib/link-intake-token";
import { LinkIntakeInactivePage } from "@/components/intake/LinkIntakeInactivePage";

export const dynamic = "force-dynamic";
import { getShopVertical } from "@/lib/vertical-context";

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
      title: shopName ? `${shopName} · Book a visit` : "Book a visit",
      description: copy.formDescription,
    };
  } catch {
    return {
      title: "Book a visit",
      description: copy.formDescription,
    };
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
};

export default async function LinkIntakePage({
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
        <main className="vow-app-px flex min-h-[100dvh] items-center justify-center bg-brand-50">
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
    const truncated = !session && isLikelyTruncatedLinkToken(rawToken);
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-brand-50 px-6">
        <div className="max-w-sm rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">
            {truncated ? copy.incompleteLinkTitle : copy.expiredTitle}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {truncated ? copy.incompleteLinkBody : copy.expiredBody}
          </p>
        </div>
      </main>
    );
  }

  if (!(await isLinkIntakeTenantActive(session.userId))) {
    return <LinkIntakeInactivePage />;
  }

  const [shopName, vertical] = await Promise.all([
    shopDisplayNameForUser(session.userId),
    getShopVertical(session.userId),
  ]);

  if (canSubmitLinkIntakeForm(session)) {
    return (
      <main className="min-h-[100dvh]">
        <LinkIntakeCopyProvider>
          <LinkIntakeForm token={token} shopName={shopName} vertical={vertical} />
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
