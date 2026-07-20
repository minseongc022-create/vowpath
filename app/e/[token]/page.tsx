import { EstimateShareView } from "@/components/estimate/EstimateShareView";

export default async function EstimateSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <EstimateShareView token={token} />;
}
