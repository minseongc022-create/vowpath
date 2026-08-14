import { redirect } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";

export default function GiuRegisterRedirect() {
  redirect(`${GIU_ROUTES.auth}?mode=signup`);
}
