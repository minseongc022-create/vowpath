import { Suspense } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { BoxFilters } from "@/giu/components/BoxFilters";
import { listBoxes, listMerchants } from "@/giu/lib/store";
import { GIU_STRINGS } from "@/giu/lib/strings";

type Props = {
  searchParams: Promise<{ district?: string; category?: string }>;
};

export default async function GiuBoxesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [boxes, merchants] = await Promise.all([
    listBoxes({
      district: params.district,
      category: params.category,
      openOnly: true,
    }),
    listMerchants(),
  ]);
  const merchantMap = new Map(merchants.map((m) => [m.id, m]));

  return (
    <div className="giu-page">
      <h1 className="giu-section-title">{GIU_STRINGS.navBoxes}</h1>
      <p className="giu-section-sub">{GIU_STRINGS.goldenHour}</p>

      <div className="mt-5">
        <Suspense fallback={null}>
          <BoxFilters />
        </Suspense>
      </div>

      {boxes.length > 0 ? (
        <div className="mt-5 space-y-3">
          {boxes.map((box) => {
            const merchant = merchantMap.get(box.merchantId);
            if (!merchant) return null;
            return <BoxCard key={box.id} box={box} merchant={merchant} />;
          })}
        </div>
      ) : (
        <div className="giu-card mt-8 text-center text-sm text-giu-muted">
          조건에 맞는 박스가 없습니다. 필터를 바꾸거나 19시 이후에 다시 확인해 주세요.
        </div>
      )}
    </div>
  );
}
