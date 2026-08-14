import { redirect } from "next/navigation";
import { getGiuSession } from "@/giu/lib/auth-request";
import { GIU_ROUTES, homePathForRole } from "@/giu/lib/routes";

export default async function GiuRootPage() {
  const session = await getGiuSession();
  if (session) {
    redirect(homePathForRole(session.role));
  }
  redirect(GIU_ROUTES.customer.home);
}
