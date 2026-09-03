import type { Metadata } from "next";
import { NotificationSettingsWorkspace } from "@/dajeong/components/NotificationSettingsWorkspace";
import "@/dajeong/styles/plan.css";
import "@/dajeong/styles/companions.css";

export const metadata: Metadata = { title: { absolute: "알림 설정 · 하루위드" } };

export default function DajeongNotificationsPage() {
  return <NotificationSettingsWorkspace />;
}
