import { redirect } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { QuotesClient } from "@/components/Dashboard";
import { getSession } from "@/lib/auth";

export default async function QuotesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell shopName={session.shopName}>
      <QuotesClient />
    </AppShell>
  );
}
