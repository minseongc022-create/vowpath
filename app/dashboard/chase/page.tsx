import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default function ChaseDashboardPage() {
  redirect(`${ROUTES.quotes}?tab=chase`);
}
