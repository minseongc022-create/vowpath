import { CustomerTrackView } from "@/components/tracking/CustomerTrackView";

export default async function CustomerTrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CustomerTrackView token={token} />;
}
