import { CorrectionIntakePageClient } from "@/components/intake/CorrectionIntakePageClient";
import { LinkIntakeCopyProvider } from "@/components/intake/LinkIntakeCopyContext";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CorrectionIntakePage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="min-h-[100dvh]">
      <LinkIntakeCopyProvider>
        <CorrectionIntakePageClient token={token} />
      </LinkIntakeCopyProvider>
    </main>
  );
}
