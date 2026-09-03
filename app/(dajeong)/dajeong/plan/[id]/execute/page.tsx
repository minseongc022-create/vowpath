import type { Metadata } from "next";
import { ExecutionWorkspace } from "@/dajeong/components/ExecutionWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/execution.css";

export const metadata: Metadata = { title: { absolute: "준비 진행 · 하루위드" } };

export default async function DajeongExecutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExecutionWorkspace planId={id} />;
}
