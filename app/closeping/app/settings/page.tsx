import Link from "next/link";
import { redirect } from "next/navigation";
import { ClosePingAppShell } from "@/components/closeping/ClosePingShell";
import { getSession } from "@/lib/session";
import { CLOSEPING, CLOSEPING_ROUTES } from "@/lib/closeping/constants";
import { ROUTES } from "@/lib/constants";

export default async function ClosePingSettingsPage() {
  const session = await getSession();
  if (!session) redirect(CLOSEPING_ROUTES.login);

  return (
    <ClosePingAppShell shopName={session.shopName}>
      <h1 className="text-2xl font-bold text-ping-950">Settings</h1>
      <div className="mt-6 space-y-4 rounded-xl border border-ping-100 bg-white p-6">
        <div>
          <p className="text-sm font-medium text-stone-500">Shop name (on SMS)</p>
          <p className="mt-1 font-semibold text-ping-950">{session.shopName}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-stone-500">Account email</p>
          <p className="mt-1 text-ping-950">{session.email}</p>
        </div>
        <p className="text-sm text-stone-600">
          Update shop name and billing in your{" "}
          <Link href={ROUTES.settings} className="font-medium text-ping-700 hover:underline">
            Effiroad account settings
          </Link>
          . {CLOSEPING.name} shares the same login and Twilio SMS infrastructure.
        </p>
      </div>
    </ClosePingAppShell>
  );
}
