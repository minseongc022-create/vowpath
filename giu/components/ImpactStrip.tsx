import { formatVnd } from "@/giu/lib/format";

type Props = {
  rescuedBoxes: number;
  savedVnd: number;
};

/** Compressed TGTG-style impact strip. */
export function ImpactStrip({ rescuedBoxes, savedVnd }: Props) {
  const co2kg = Math.round(rescuedBoxes * 2.5);
  return (
    <div className="giu-card grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-[18px] font-extrabold text-giu-ink">{rescuedBoxes}</p>
        <p className="text-[10px] font-medium text-giu-muted">구출 박스</p>
      </div>
      <div>
        <p className="text-[18px] font-extrabold text-giu-ink">{co2kg}</p>
        <p className="text-[10px] font-medium text-giu-muted">kg CO₂</p>
      </div>
      <div>
        <p className="text-[15px] font-extrabold leading-tight text-giu-ink">{formatVnd(savedVnd)}</p>
        <p className="text-[10px] font-medium text-giu-muted">절약</p>
      </div>
    </div>
  );
}
