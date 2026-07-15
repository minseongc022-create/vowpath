import { DemoLinkIntakeScene } from "@/components/demo/DemoLinkIntakeScene";
import type { DemoVertical } from "@/lib/demo-vertical-config";

export default async function LinkIntakeDemoRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical: v } = await searchParams;
  const vertical: DemoVertical = v === "hvac" ? "hvac" : "restoration";
  return <DemoLinkIntakeScene vertical={vertical} />;
}
