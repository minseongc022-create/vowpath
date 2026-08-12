import { redirect } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { QuoteDetail } from "@/components/QuoteDetail";
import { getSession } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return (
    <AppShell shopName={session.shopName}>
      <QuoteDetail id={id} />
    </AppShell>
  );
}
