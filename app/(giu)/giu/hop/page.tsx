import { Suspense } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { BoxFilters } from "@/giu/components/BoxFilters";
import { DiscoverControls } from "@/giu/components/DiscoverControls";
import { MapBrowse } from "@/giu/components/MapBrowse";
import { PayStatusBanner } from "@/giu/components/PayStatusBanner";
import { WaitlistForm } from "@/giu/components/WaitlistForm";
import { listBoxes, listMerchants } from "@/giu/lib/store";
import type { GiuBox } from "@/giu/lib/types";

type Props = {
  searchParams: Promise<{
    district?: string;
    category?: string;
    q?: string;
    pay?: string;
    when?: string;
    view?: string;
    sort?: string;
    sold?: string;
  }>;
};

function sortBoxes(boxes: GiuBox[], sort: string): GiuBox[] {
  const copy = [...boxes];
  if (sort === "price") return copy.sort((a, b) => a.salePriceVnd - b.salePriceVnd);
  if (sort === "discount") {
    return copy.sort((a, b) => {
      const da = 1 - a.salePriceVnd / a.originalPriceVnd;
      const db = 1 - b.salePriceVnd / b.originalPriceVnd;
      return db - da;
    });
  }
  return copy.sort((a, b) => a.pickupStart.localeCompare(b.pickupStart));
}

export default async function GiuBoxesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() ?? "";
  const includeSoldOut = params.sold === "1";
  const when = params.when;
  const dayOffset = when === "today" ? (0 as const) : when === "tomorrow" ? (1 as const) : undefined;
  const view = params.view === "map" ? "map" : "list";
  const sort = params.sort ?? "soon";

  const [boxes, merchants] = await Promise.all([
    listBoxes({
      district: params.district,
      category: params.category,
      openOnly: !includeSoldOut,
      includeSoldOut: includeSoldOut || undefined,
      dayOffset,
    }),
    listMerchants(),
  ]);
  const merchantMap = new Map(merchants.map((m) => [m.id, m]));

  const filtered = sortBoxes(
    q
      ? boxes.filter((box) => {
          const merchant = merchantMap.get(box.merchantId);
          const hay = `${box.title} ${box.description ?? ""} ${merchant?.name ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      : boxes,
    sort,
  );

  const items = filtered
    .map((box) => {
      const merchant = merchantMap.get(box.merchantId);
      if (!merchant) return null;
      return { box, merchant };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="giu-page">
      <Suspense fallback={null}>
        <PayStatusBanner />
      </Suspense>

      <header className="mb-3">
        <h1 className="giu-section-title">구출하기</h1>
        <p className="giu-section-sub">언제든 · 근처 마감 음식 · 코드로 픽업</p>
      </header>

      <div className="mb-3 space-y-3">
        <Suspense fallback={null}>
          <DiscoverControls />
        </Suspense>
        <Suspense fallback={null}>
          <BoxFilters />
        </Suspense>
      </div>

      {items.length > 0 ? (
        view === "map" ? (
          <MapBrowse items={items} />
        ) : (
          <>
            <p className="mb-2 text-[12px] font-semibold text-giu-muted">박스 {items.length}</p>
            <div className="space-y-2.5">
              {items.map(({ box, merchant }, i) => (
                <div
                  key={box.id}
                  className={box.status !== "mo" || box.quantityLeft <= 0 ? "opacity-55" : undefined}
                >
                  <BoxCard box={box} merchant={merchant} index={i} />
                </div>
              ))}
            </div>
          </>
        )
      ) : (
        <div className="mt-6 space-y-3">
          <div className="giu-card text-center">
            <p className="font-bold text-giu-ink">지금은 열린 박스가 없어요</p>
            <p className="mt-1.5 text-[13px] text-giu-muted">
              번호를 남기면 생기면 알려드릴게요. 즐겨찾기도 켜 두세요.
            </p>
          </div>
          <WaitlistForm district={params.district} />
        </div>
      )}
    </div>
  );
}
