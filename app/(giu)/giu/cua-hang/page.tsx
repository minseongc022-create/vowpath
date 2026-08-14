import { redirect } from "next/navigation";
import { getGiuSession } from "@/giu/lib/auth-request";
import { GIU_ROUTES } from "@/giu/lib/routes";

export default async function GiuMerchantsLandingRedirect() {
  const session = await getGiuSession();
  if (session?.role === "merchant") {
    redirect(GIU_ROUTES.merchant.home);
  }
  redirect(`${GIU_ROUTES.auth}?role=merchant`);
}
