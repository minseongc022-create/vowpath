import type { Metadata } from "next";
import { PlanWorkspace } from "@/dajeong/components/PlanWorkspace";
import "@/dajeong/styles/plan.css";

export const metadata: Metadata = { title: { absolute: "계획 검토 · 하루위드" } };

export default async function DajeongPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanWorkspace planId={id} />;
}
