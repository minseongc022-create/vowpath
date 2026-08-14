import { redirect } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";

export default function GiuLoginRedirect() {
  redirect(GIU_ROUTES.auth);
}
