import { TechGoView } from "@/components/tracking/TechGoView";

export default async function TechGoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TechGoView token={token} />;
}
