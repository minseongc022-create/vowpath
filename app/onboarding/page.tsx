import { redirect } from "next/navigation";

/** 기존 /onboarding 링크 → 연동 설정 페이지로 통합 */
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
