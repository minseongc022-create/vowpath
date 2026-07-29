import { redirect } from "next/navigation";
import { MATCHCUT } from "@/lib/matchcut/constants";

export default function SourcingRedirectPage() {
  redirect(MATCHCUT.routes.home);
}
