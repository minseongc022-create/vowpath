import { CorrectionIntakePageClient } from "@/components/intake/CorrectionIntakePageClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CorrectionIntakePage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="min-h-[100dvh]">
      <CorrectionIntakePageClient token={token} />
    </main>
  );
}
