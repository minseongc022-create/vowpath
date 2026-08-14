import { ProviderPanelClient } from "@/mano/components/ProviderPanelClient";

type Props = { searchParams: Promise<{ id?: string }> };

export default async function ProfesionalPanelPage({ searchParams }: Props) {
  const sp = await searchParams;
  const providerId = sp.id ?? "pro_seed_001";

  return <ProviderPanelClient providerId={providerId} />;
}
