import { redirect } from "next/navigation";
import { ClosePingAppShell } from "@/components/closeping/ClosePingShell";
import { ClosePingQuoteDetail } from "@/components/closeping/ClosePingQuoteDetail";
import { getSession } from "@/lib/session";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";

type Props = { params: Promise<{ id: string }> };

export default async function ClosePingQuoteDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(CLOSEPING_ROUTES.login);

  const { id } = await params;

  return (
    <ClosePingAppShell shopName={session.shopName}>
      <ClosePingQuoteDetail id={id} />
    </ClosePingAppShell>
  );
}
