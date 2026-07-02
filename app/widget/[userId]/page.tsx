import { WidgetChat } from "@/components/widget/WidgetChat";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <WidgetChat userId={userId} />;
}
