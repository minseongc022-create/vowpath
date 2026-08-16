import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getGiuSession } from "@/giu/lib/auth-request";
import { homePathForRole } from "@/giu/lib/routes";

export default async function GiuRootPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const session = await getGiuSession();
  if (session) {
    redirect(homePathForRole(session.role, host));
  }
  redirect(homePathForRole("customer", host));
}
