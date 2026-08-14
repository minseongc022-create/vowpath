import { Suspense } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { BoxFilters } from "@/giu/components/BoxFilters";
import { listBoxes, listMerchants } from "@/giu/lib/store";

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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-giu-ink">Săn hộp giải cứu</h1>
      <p className="mt-2 text-giu-muted">Giờ vàng 19h–21h · Quận 1, 3, 7, 10, Bình Thạnh, Phú Nhuận</p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <BoxFilters />
        </Suspense>
      </div>

      {boxes.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boxes.map((box) => {
            const merchant = merchantMap.get(box.merchantId);
            if (!merchant) return null;
            return <BoxCard key={box.id} box={box} merchant={merchant} />;
          })}
        </div>
      ) : (
        <p className="mt-12 text-center text-giu-muted">
          Chưa có hộp phù hợp. Thử đổi bộ lọc hoặc quay lại sau 19h.
        </p>
      )}
    </div>
  );
}
