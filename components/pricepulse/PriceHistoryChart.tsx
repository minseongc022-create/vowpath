import type { PriceHistoryRow } from "@/pricepulse/lib/dashboard/db.ts";
import { formatDate, formatKrw } from "@/pricepulse/lib/dashboard/format.ts";

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

/**
 * Dependency-free price history line. A single chart doesn't earn a charting
 * library in this app's bundle — plain SVG, server-rendered, no client JS.
 */
export function PriceHistoryChart({ rows }: { rows: PriceHistoryRow[] }) {
  const priced = rows.filter((row) => row.price !== null) as (PriceHistoryRow & { price: number })[];
  if (priced.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
        가격 데이터가 2일 이상 쌓이면 그래프가 표시됩니다 (현재 {priced.length}일치).
      </div>
    );
  }

  const prices = priced.map((row) => row.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (priced.length - 1)) * innerW;
  const y = (price: number) => PAD.top + innerH - ((price - min) / span) * innerH;

  const linePath = priced.map((row, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(row.price).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(priced.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const ticks = [min, min + span / 2, max];
  const first = priced[0];
  const last = priced[priced.length - 1];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="가격 히스토리">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#64748b">
              {tick.toLocaleString("ko-KR")}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="#3b82f6" fillOpacity={0.08} />
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} />
        {priced.map((row, i) => (
          <circle key={row.observed_on} cx={x(i)} cy={y(row.price)} r={row.sold_out ? 0 : 2.5} fill="#2563eb" />
        ))}
        <text x={PAD.left} y={HEIGHT - 8} fontSize={11} fill="#64748b">
          {formatDate(first.observed_on)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize={11} fill="#64748b" textAnchor="end">
          {formatDate(last.observed_on)}
        </text>
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>최저 {formatKrw(min)}</span>
        <span>최고 {formatKrw(max)}</span>
      </div>
    </div>
  );
}
