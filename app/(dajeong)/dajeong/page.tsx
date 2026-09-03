import type { Metadata } from "next";
import { HomePlanner } from "@/dajeong/components/HomePlanner";
import "@/dajeong/styles/home.css";

export const metadata: Metadata = {
  title: { absolute: "하루온 · 마음속 하루를 현실로" },
  description: "하고 싶은 상황을 말하면 취향과 실제 장소를 이해해 특별한 하루를 설계하고 실행까지 준비하는 AI 컨시어지입니다.",
};

export default function DajeongHomePage() {
  return <HomePlanner />;
}
