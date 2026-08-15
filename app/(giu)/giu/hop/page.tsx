import { Suspense } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { BoxFilters } from "@/giu/components/BoxFilters";
import { PayStatusBanner } from "@/giu/components/PayStatusBanner";
import { WaitlistForm } from "@/giu/components/WaitlistForm";
import { GIU_BRAND } from "@/giu/lib/brand";
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

      <header className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-giu-primary">
              {GIU_BRAND.name}
            </p>
            <h1 className="giu-section-title mt-0.5">오늘 구출</h1>
            <p className="giu-section-sub">호치민 마감 · 50~70% · 코드로 픽업</p>
          </div>
          <span className="giu-hour-chip shrink-0">
            <span className="giu-hour-dot" aria-hidden />
            19–21시
          </span>
        </div>
      </header>

      <div className="mb-4">
        <Suspense fallback={null}>
          <BoxFilters />
        </Suspense>
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-2 text-[12px] font-semibold text-giu-muted">
            열린 박스 {filtered.length}
          </p>
          <div className="space-y-2.5">
            {filtered.map((box, i) => {
              const merchant = merchantMap.get(box.merchantId);
              if (!merchant) return null;
              return <BoxCard key={box.id} box={box} merchant={merchant} index={i} />;
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="giu-card text-center">
            <p className="font-bold text-giu-ink">지금은 열린 박스가 없어요</p>
            <p className="mt-1.5 text-[13px] text-giu-muted">
              번호를 남기면 근처에 생길 때 알려드릴게요.
            </p>
          </div>
          <WaitlistForm district={params.district} />
        </div>
      )}
    </div>
  );
}
