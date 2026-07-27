import { redirect } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { OverviewClient } from "@/components/Dashboard";
import { getSession } from "@/lib/auth";

export default async function AppHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell shopName={session.shopName}>
      <OverviewClient />
    </AppShell>
  );
}
