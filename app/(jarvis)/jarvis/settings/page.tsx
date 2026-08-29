import type { Metadata } from "next";
import { SettingsView } from "@/jarvis/ui/SettingsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "설정 · 자비스",
  description: "연동과 자동 운전 설정",
};

export default function JarvisSettingsPage() {
  return <SettingsView />;
}
