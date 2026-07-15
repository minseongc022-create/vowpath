import { DemoOverviewScene } from "@/components/demo/DemoOverviewScene";
import type { DemoVertical } from "@/lib/demo-vertical-config";

export default async function OverviewDemoRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical: v } = await searchParams;
  const vertical: DemoVertical = v === "hvac" ? "hvac" : "restoration";
  return <DemoOverviewScene vertical={vertical} />;
}
