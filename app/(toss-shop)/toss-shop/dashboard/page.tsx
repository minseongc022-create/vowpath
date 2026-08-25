import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { JarvisConsole } from "@/toss-shop/components/JarvisConsole";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

export default async function DashboardPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return <JarvisConsole />;
}
