import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { DashboardHomeClient } from "@/toss-shop/components/DashboardHomeClient";

export default async function DashboardPage() {
  const session = await getTossShopSession();
  if (!session) redirect("/toss-shop/login");

  return <DashboardHomeClient />;
}
