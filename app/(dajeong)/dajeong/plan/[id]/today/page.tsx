import type { Metadata } from "next";
import { TodayWorkspace } from "@/dajeong/components/TodayWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/execution.css";

export const metadata: Metadata = { title: { absolute: "오늘 일정 · 하루위드" } };

export default async function DajeongTodayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TodayWorkspace planId={id} />;
}
