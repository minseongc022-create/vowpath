import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getGiuSession } from "@/giu/lib/auth-request";
import { homePathForRole } from "@/giu/lib/routes";

export default async function GiuRootPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  // Prefer public paths whenever this request is the Giu product shell
  const publicHost = h.get("x-app-shell") === "giu" ? host ?? "giucuu.com" : host;
  const session = await getGiuSession();
  if (session) {
    redirect(homePathForRole(session.role, publicHost));
  }
  redirect(homePathForRole("customer", publicHost));
}
