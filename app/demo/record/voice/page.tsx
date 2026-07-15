import { DemoAiPhoneScene } from "@/components/demo/DemoAiPhoneScene";
import type { DemoVertical } from "@/lib/demo-vertical-config";

export default async function VoiceDemoRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical: v } = await searchParams;
  const vertical: DemoVertical = v === "hvac" ? "hvac" : "restoration";
  return <DemoAiPhoneScene recordMode vertical={vertical} />;
}
