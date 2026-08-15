import { Suspense } from "react";
import { MapDiscoverClient } from "@/giu/components/MapDiscoverClient";
import { PayStatusBanner } from "@/giu/components/PayStatusBanner";
import { buildMapPins } from "@/giu/lib/map-pins";
import { listBoxes, listMerchants } from "@/giu/lib/store";

type Props = {
  searchParams: Promise<{ pay?: string }>;
};

export default async function GiuBoxesPage({ searchParams }: Props) {
  await searchParams;
  const [boxes, merchants] = await Promise.all([
    listBoxes({ openOnly: true }),
    listMerchants(),
  ]);
  const pins = buildMapPins(boxes, merchants);

  return (
    <div className="relative w-full">
      <Suspense fallback={null}>
        <div className="absolute left-0 right-0 top-0 z-[600] px-3 pt-2">
          <div className="mx-auto max-w-[480px] md:max-w-xl">
            <PayStatusBanner />
          </div>
        </div>
      </Suspense>
      <MapDiscoverClient pins={pins} />
    </div>
  );
}
