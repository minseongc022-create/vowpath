import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** Legacy /onboarding links redirect to integration settings */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction_id?: string; focus?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  if (params.transaction_id) qs.set("transaction_id", params.transaction_id);
  if (params.plan) qs.set("plan", params.plan);
  if (params.focus === "schedule") qs.set("section", "schedule");

  const query = qs.toString();
  redirect(`${ROUTES.settings}${query ? `?${query}` : ""}`);
}
