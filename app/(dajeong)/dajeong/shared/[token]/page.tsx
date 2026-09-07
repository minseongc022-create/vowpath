import type { Metadata } from "next";
import { SharedPlanWorkspace } from "@/dajeong/components/SharedPlanWorkspace";
import "@/dajeong/styles/plan.css";

export const metadata: Metadata = { title: { absolute: "함께 보는 계획 · 하루온" }, robots: { index: false, follow: false } };

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedPlanWorkspace token={token} />;
}
