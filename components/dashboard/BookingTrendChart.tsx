"use client";

import { useMemo, useState } from "react";
import type { BookingTrendPoint } from "@/lib/operations-analytics";
import { dashboardUi } from "@/lib/content";

const ops = dashboardUi.ops;

const CHART_WIDTH = 720;
const CHART_HEIGHT = 252;
const PAD = { t: 20, r: 20, b: 44, l: 44 };

const TOOLTIP_OFFSET = 14;

type CursorPoint = { x: number; y: number };

function pickAxisLabelIndices(length: number, maxLabels: number): Set<number> {
  if (length <= 0) return new Set();
  if (length === 1) return new Set([0]);
  if (length <= maxLabels) return new Set(Array.from({ length }, (_, i) => i));

  const indices = new Set<number>([0, length - 1]);
  const inner = maxLabels - 2;
  for (let k = 1; k <= inner; k++) {
    indices.add(Math.round((k * (length - 1)) / (inner + 1)));
  }
  return indices;
}

function ChartGrid({
  maxY,
  innerH,
  padL,
  width,
  padR,
  padT,
}: {
  maxY: number;
  innerH: number;
  padL: number;
  width: number;
  padR: number;
  padT: number;
}) {
  return [0, maxY / 2, maxY].map((tick) => {
    const y = padT + innerH - (tick / maxY) * innerH;
    return (
      <g key={tick}>
        <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
        <text x={padL - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
          {Math.round(tick)}
        </text>
      </g>
    );
  });
}

function CursorTooltip({
  point,
  cursor,
}: {
  point: BookingTrendPoint;
  cursor: CursorPoint;
}) {
  const maxLeft =
    typeof window !== "undefined" ? window.innerWidth - 220 : cursor.x + TOOLTIP_OFFSET;
  const maxTop =
    typeof window !== "undefined" ? window.innerHeight - 100 : cursor.y + TOOLTIP_OFFSET;
  const left = Math.min(cursor.x + TOOLTIP_OFFSET, maxLeft);
  const top = Math.min(cursor.y + TOOLTIP_OFFSET, maxTop);

  return (
    <div
      className="pointer-events-none fixed z-[200] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
      style={{ left, top }}
      role="tooltip"
    >
      <p className="whitespace-nowrap text-[11px] font-semibold text-slate-900">
        {point.periodLabel ?? point.label}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-600">{ops.trendTooltipBookings(point.bookings)}</p>
      <p className="text-[11px] text-slate-500">{ops.trendTooltipCalls(point.calls)}</p>
    </div>
  );
}

function useCursorTooltip() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [cursor, setCursor] = useState<CursorPoint | null>(null);

  const bindBar = (index: number) => ({
    onMouseEnter: (e: React.MouseEvent) => {
      setHovered(index);
      setCursor({ x: e.clientX, y: e.clientY });
    },
    onMouseMove: (e: React.MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
    },
    onMouseLeave: () => {
      setHovered(null);
      setCursor(null);
    },
    onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
      setHovered(index);
      const rect = e.currentTarget.getBoundingClientRect();
      setCursor({ x: rect.left + rect.width / 2, y: rect.top });
    },
    onBlur: () => {
      setHovered(null);
      setCursor(null);
    },
  });

  return { hovered, cursor, bindBar, clear: () => { setHovered(null); setCursor(null); } };
}

function granularityHint(data: BookingTrendPoint[]): string | null {
  const g = data[0]?.granularity;
  if (g === "week") return ops.trendWeeklyHint;
  if (g === "month") return ops.trendMonthlyHint;
  return null;
}

function LineTrendChart({ data }: { data: BookingTrendPoint[] }) {
  const { hovered, cursor, bindBar } = useCursorTooltip();
  const innerW = CHART_WIDTH - PAD.l - PAD.r;
  const innerH = CHART_HEIGHT - PAD.t - PAD.b;
  const labelIndices = pickAxisLabelIndices(data.length, Math.min(data.length, 10));
  const maxY = Math.max(1, ...data.map((d) => d.bookings));

  const coords = useMemo(() => {
    return data.map((d, i) => {
      const x = PAD.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = PAD.t + innerH - (d.bookings / maxY) * innerH;
      const leftPct = (x / CHART_WIDTH) * 100;
      return { x, y, d, i, leftPct };
    });
  }, [data, innerW, innerH, maxY]);

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = (() => {
    if (!coords.length) return "";
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const base = PAD.t + innerH;
    return `M ${firstX},${base} L ${polylinePoints.replace(/ /g, " L ")} L ${lastX},${base} Z`;
  })();

  const active = hovered !== null ? coords[hovered] : null;

  return (
    <>
      {active && cursor ? <CursorTooltip point={active.d} cursor={cursor} /> : null}
      <div className="relative max-h-[280px]">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="pointer-events-none h-auto w-full max-h-[280px]"
          role="img"
          aria-label="Booking trend"
        >
          <ChartGrid
            maxY={maxY}
            innerH={innerH}
            padL={PAD.l}
            width={CHART_WIDTH}
            padR={PAD.r}
            padT={PAD.t}
          />
          <path d={areaPath} fill="url(#bookingFill)" opacity={0.35} />
          <polyline
            fill="none"
            stroke="#0a84c7"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
          {coords.map(({ x, y, d, i }) =>
            labelIndices.has(i) ? (
              <text
                key={`lbl-${d.date}`}
                x={x}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-medium"
              >
                {d.label}
              </text>
            ) : null,
          )}
          <defs>
            <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a84c7" />
              <stop offset="100%" stopColor="#0a84c7" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
        <div className="pointer-events-none absolute inset-0 max-h-[280px]">
          {coords.map(({ x, y, d, i, leftPct }) => (
            <button
              key={d.date}
              type="button"
              className="pointer-events-auto absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0"
              style={{ left: `${leftPct}%`, top: `${(y / CHART_HEIGHT) * 100}%` }}
              aria-label={`${d.periodLabel ?? d.label}, ${ops.trendTooltipBookings(d.bookings)}`}
              {...bindBar(i)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function BarTrendChart({ data }: { data: BookingTrendPoint[] }) {
  const { hovered, cursor, bindBar } = useCursorTooltip();
  const maxY = Math.max(1, ...data.map((d) => d.bookings));
  const labelIndices = pickAxisLabelIndices(data.length, Math.min(data.length, 8));
  const active = hovered !== null ? data[hovered] : null;

  return (
    <>
      {active && cursor ? <CursorTooltip point={active} cursor={cursor} /> : null}
      <div className="flex h-[252px] items-end gap-1 sm:gap-1.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <button
              type="button"
              className="flex w-full max-w-[3.5rem] flex-col items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label={`${d.periodLabel ?? d.label}, ${ops.trendTooltipBookings(d.bookings)}`}
              {...bindBar(i)}
            >
              <span className="text-[10px] font-semibold text-slate-600 tabular-nums">
                {d.bookings > 0 ? d.bookings : ""}
              </span>
              <div
                className={`w-full rounded-t-md transition-colors ${
                  d.bookings > 0
                    ? hovered === i
                      ? "bg-[#066ba3]"
                      : "bg-brand-600"
                    : "bg-slate-200"
                }`}
                style={{
                  height: `${d.bookings > 0 ? Math.max(6, (d.bookings / maxY) * 168) : 4}px`,
                }}
              />
            </button>
            {labelIndices.has(i) ? (
              <span className="text-center text-[10px] font-medium text-slate-500">{d.label}</span>
            ) : (
              <span className="h-[15px]" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function BookingTrendChart({ data }: { data: BookingTrendPoint[] }) {
  const hint = granularityHint(data);
  const isOverview = data[0]?.granularity === "week" || data[0]?.granularity === "month";

  return (
    <div className="relative isolate min-h-[280px]">
      <p
        className={`mb-2 min-h-[1rem] text-right text-[10px] font-medium text-slate-400 ${hint ? "" : "invisible"}`}
        aria-hidden={!hint}
      >
        {hint ?? "\u00a0"}
      </p>
      <div className="min-h-[252px]">
        {isOverview ? <BarTrendChart data={data} /> : <LineTrendChart data={data} />}
      </div>
    </div>
  );
}
