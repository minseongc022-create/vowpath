import { redirect } from "next/navigation";
import { MerchantLandingClient } from "@/giu/components/MerchantLandingClient";
import { getGiuSession } from "@/giu/lib/auth-request";
import { GIU_ROUTES } from "@/giu/lib/routes";

export default async function GiuMerchantsLandingPage() {
  const session = await getGiuSession();
  if (session?.role === "merchant") {
    redirect(GIU_ROUTES.merchant.home);
  }
  return <MerchantLandingClient />;
}
