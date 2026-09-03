import type { Metadata } from "next";
import { PlansWorkspace } from "@/dajeong/components/PlansWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/execution.css";

export const metadata: Metadata = { title: { absolute: "내 계획 · 하루위드" } };

export default function DajeongPlansPage() {
  return <PlansWorkspace />;
}
