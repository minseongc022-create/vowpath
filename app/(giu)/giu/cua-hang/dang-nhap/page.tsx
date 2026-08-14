import { redirect } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";

export default function GiuMerchantLoginRedirect() {
  redirect(`${GIU_ROUTES.auth}?role=merchant`);
}
