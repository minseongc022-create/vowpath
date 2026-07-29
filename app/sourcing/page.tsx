import { redirect } from "next/navigation";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export default function SourcingRedirectPage() {
  redirect(MATCHCUT_ROUTES.home);
}
