import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { DashboardHomeClient } from "@/toss-shop/components/DashboardHomeClient";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

export default async function DashboardPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return <DashboardHomeClient />;
}
