import type { Metadata } from "next";
import { ReservationLiveTest } from "@/dajeong/components/ReservationLiveTest";
import "@/dajeong/styles/ops.css";

export const metadata: Metadata = {
  title: { absolute: "Haruwith · 예약 전화 운영 테스트" },
  robots: { index: false, follow: false },
};

export default function ReservationTestPage() {
  return <ReservationLiveTest />;
}
