import type { Metadata } from "next";
import { LoginWorkspace } from "@/dajeong/components/LoginWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/companions.css";

export const metadata: Metadata = { title: { absolute: "로그인 · 하루온" } };

export default function DajeongLoginPage() {
  return <LoginWorkspace />;
}
