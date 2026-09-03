import type { Metadata } from "next";
import { CompanionsWorkspace } from "@/dajeong/components/CompanionsWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/companions.css";

export const metadata: Metadata = { title: { absolute: "동반자 · 하루위드" } };

export default function DajeongCompanionsPage() {
  return <CompanionsWorkspace />;
}
