import { redirect } from "next/navigation";

/** Legacy /onboarding links redirect to integration settings */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; focus?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  if (params.session_id) qs.set("session_id", params.session_id);
  if (params.plan) qs.set("plan", params.plan);
  if (params.focus === "schedule") qs.set("section", "schedule");

  const query = qs.toString();
  redirect(`/settings${query ? `?${query}` : ""}`);
}
