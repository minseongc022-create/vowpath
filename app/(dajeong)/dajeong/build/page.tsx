import type { Metadata } from "next";
import { PlanBuilderWorkspace } from "@/dajeong/components/PlanBuilderWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/builder.css";

export const metadata: Metadata = { title: { absolute: "직접 만들기 · 하루위드" } };

export default function DajeongBuildPage() {
  return <PlanBuilderWorkspace />;
}
