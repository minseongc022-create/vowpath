import { Suspense } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { BoxFilters } from "@/giu/components/BoxFilters";
import { PayStatusBanner } from "@/giu/components/PayStatusBanner";
import { WaitlistForm } from "@/giu/components/WaitlistForm";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { listBoxes, listMerchants } from "@/giu/lib/store";

type Props = {
  searchParams: Promise<{
    district?: string;
    category?: string;
    q?: string;
    pay?: string;
  }>;
};

export default async function GiuBoxesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() ?? "";
  const [boxes, merchants] = await Promise.all([
    listBoxes({
      district: params.district,
      category: params.category,
      openOnly: true,
    }),
    listMerchants(),
  ]);
  const merchantMap = new Map(merchants.map((m) => [m.id, m]));

  const filtered = q
    ? boxes.filter((box) => {
        const merchant = merchantMap.get(box.merchantId);
        const hay = `${box.title} ${box.description ?? ""} ${merchant?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : boxes;

  return (
    <div className="giu-page">
      <Suspense fallback={null}>
        <PayStatusBanner />
      </Suspense>

      <div className="giu-card mb-5 space-y-2">
        <h2 className="font-semibold text-giu-ink">{GIU_STRINGS.howItWorks}</h2>
        <ol className="space-y-1 text-sm text-giu-muted">
          <li>
            <span className="font-semibold text-giu-ink">1. {GIU_STRINGS.step1Title}</span> —{" "}
            {GIU_STRINGS.step1Desc}
          </li>
          <li>
            <span className="font-semibold text-giu-ink">2. {GIU_STRINGS.step2Title}</span> —{" "}
            {GIU_STRINGS.step2Desc}
          </li>
          <li>
            <span className="font-semibold text-giu-ink">3. {GIU_STRINGS.step3Title}</span> —{" "}
            {GIU_STRINGS.step3Desc}
          </li>
        </ol>
      </div>

      <h1 className="giu-section-title">{GIU_STRINGS.navBoxes}</h1>
      <p className="giu-section-sub">{GIU_STRINGS.goldenHour}</p>

      <div className="mt-5">
        <Suspense fallback={null}>
          <BoxFilters />
        </Suspense>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-5 space-y-3">
          {filtered.map((box) => {
            const merchant = merchantMap.get(box.merchantId);
            if (!merchant) return null;
            return <BoxCard key={box.id} box={box} merchant={merchant} />;
          })}
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="giu-card text-center text-sm text-giu-muted">
            <p className="font-medium text-giu-ink">{GIU_STRINGS.emptyBoxes}</p>
            <p className="mt-2">{GIU_STRINGS.emptyBoxesHint}</p>
          </div>
          <WaitlistForm district={params.district} />
        </div>
      )}
    </div>
  );
}
