import { redirect } from "next/navigation";
import { ClosePingAppShell } from "@/components/closeping/ClosePingShell";
import { ClosePingQuoteForm } from "@/components/closeping/ClosePingQuoteForm";
import { getSession } from "@/lib/session";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";

export default async function ClosePingNewQuotePage() {
  const session = await getSession();
  if (!session) redirect(CLOSEPING_ROUTES.login);

  return (
    <ClosePingAppShell shopName={session.shopName}>
      <ClosePingQuoteForm />
    </ClosePingAppShell>
  );
}
