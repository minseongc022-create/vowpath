import type { Metadata } from "next";
import { ChatView } from "@/jarvis/ui/ChatView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "자비스",
  description: "도매 소싱부터 상세페이지까지 — 올리기 전 확인만 하세요",
};

export default function JarvisChatPage() {
  return <ChatView />;
}
