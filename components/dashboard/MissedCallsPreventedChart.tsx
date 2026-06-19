"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { MissedCallsDailyPoint } from "@/lib/missed-calls-analytics";
import { prepareMissedCallsChartData } from "@/lib/missed-calls-chart-series";
import { dashboardUi } from "@/lib/content";
import { isEnglishUi } from "@/lib/locale";
import {
  formatTrendTooltipValue,
  getTrendChartPlotValue,
} from "@/lib/owner-dashboard-kpi";
import {
  DEFAULT_TREND_SERIES_VISIBLE,
  getTrendSeriesValue,
  TREND_CHART_SERIES,
  trendSeriesDef,
  type TrendChartSeriesId,
} from "@/lib/trend-chart-series";

const PAD = { t: 24, r: 40, b: 52, l: 44 };

type ChartSize = "compact" | "home" | "full";

const SIZE_CONFIG: Record<
  ChartSize,
  {
    width: number;
    height: number;
    maxLabels: number;
    barHeight: number;
    containerClass: string;
  }
> = {
  compact: {
    width: 400,
    height: 140,
    maxLabels: 5,
    barHeight: 88,
    containerClass: "vow-missed-chart w-full",
  },
  home: {
    width: 720,
    height: 220,
    maxLabels: 8,
    barHeight: 168,
    containerClass: "vow-missed-chart w-full",
  },
  full: {
    width: 720,
    height: 280,
    maxLabels: 10,
    barHeight: 200,
    containerClass: "vow-missed-chart w-full",
  },
};

type PlotCoord = {
  x: number;
  y: number;
  d: MissedCallsDailyPoint;
  i: number;
  leftPct: number;
  topPct: number;
};

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

function yAxisTicks(maxY: number): number[] {
  if (maxY <= 1) return [0, 1];
  if (maxY <= 5) return Array.from({ length: maxY + 1 }, (_, i) => i);
  const step = maxY <= 10 ? 2 : maxY <= 20 ? 5 : Math.ceil(maxY / 4);
  const ticks: number[] = [0];
  for (let v = step; v < maxY; v += step) ticks.push(v);
  ticks.push(maxY);
  return [...new Set(ticks)].sort((a, b) => a - b);
}

function indexFromPlotX(
  clientX: number,
  rect: DOMRect,
  length: number,
  padL: number,
  innerW: number,
  chartW: number,
): number {
  if (length <= 0) return 0;
  if (length === 1) return 0;
  const plotLeft = (padL / chartW) * rect.width;
  const plotWidth = (innerW / chartW) * rect.width;
  const x = clientX - rect.left - plotLeft;
  const t = Math.max(0, Math.min(1, x / plotWidth));
  return Math.round(t * (length - 1));
}

function toggleTrendSeries(
  current: TrendChartSeriesId[],
  id: TrendChartSeriesId,
): TrendChartSeriesId[] {
  if (current.includes(id)) {
    const next = current.filter((s) => s !== id);
    return next.length > 0 ? next : current;
  }
  return [...current, id];
}

function SeriesLegend({
  visible,
  onToggle,
  dark,
}: {
  visible: TrendChartSeriesId[];
  onToggle: (id: TrendChartSeriesId) => void;
  dark: boolean;
}) {
  return (
    <div
      className="mb-3 flex flex-wrap gap-2"
      role="group"
      aria-label={isEnglishUi() ? "Select trend metrics" : "추세 지표 선택"}
    >
      {TREND_CHART_SERIES.map((series) => {
        const on = visible.includes(series.id);
        return (
          <button
            key={series.id}
            type="button"
            title={series.description}
            onClick={() => onToggle(series.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              on
                ? dark
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-brand-50 text-brand-900 ring-1 ring-brand-200"
                : dark
                  ? "bg-transparent text-slate-500 ring-1 ring-white/10 hover:text-slate-300"
                  : "bg-transparent text-slate-500 ring-1 ring-slate-200 hover:text-slate-700"
            }`}
            aria-pressed={on}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: on ? series.color : dark ? "#475569" : "#cbd5e1" }}
              aria-hidden
            />
            <span className="flex flex-col items-start leading-tight">
              <span>{series.label}</span>
              <span
                className={`text-[9px] font-normal ${
                  on ? (dark ? "text-slate-400" : "text-slate-500") : dark ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {series.shortHint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChartTooltipCard({
  point,
  dark,
  leftPct,
  topPct,
  visible,
}: {
  point: MissedCallsDailyPoint;
  dark: boolean;
  leftPct: number;
  topPct: number;
  visible: TrendChartSeriesId[];
}) {
  const flipBelow = topPct < 22;

  return (
    <div
      className={`pointer-events-none absolute z-50 min-w-[160px] max-w-[220px] rounded-lg px-3 py-2.5 shadow-xl ${
        dark
          ? "bg-[#1c2128] text-slate-100 ring-1 ring-white/15"
          : "border border-slate-200 bg-white text-slate-900"
      }`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: flipBelow
          ? "translate(-50%, 12px)"
          : "translate(-50%, calc(-100% - 12px))",
      }}
      role="tooltip"
    >
      <p className="text-[11px] font-semibold leading-snug">{point.periodLabel}</p>
      <ul className="mt-2 space-y-1">
        {visible.map((id) => {
          const def = trendSeriesDef(id);
          const value = getTrendSeriesValue(point, id);
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 text-xs tabular-nums"
            >
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: def.color }}
                  aria-hidden
                />
                {def.label}
              </span>
              <span className="font-bold" style={{ color: def.color }}>
                {formatTrendTooltipValue(id, value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function maxVisibleValue(data: MissedCallsDailyPoint[], visible: TrendChartSeriesId[]): number {
  let max = 0;
  for (const d of data) {
    for (const id of visible) {
      max = Math.max(max, getTrendChartPlotValue(d, id));
    }
  }
  return max;
}

function MultiSeriesLineChart({
  data,
  dark,
  cfg,
  visible,
}: {
  data: MissedCallsDailyPoint[];
  dark: boolean;
  cfg: (typeof SIZE_CONFIG)[ChartSize];
  visible: TrendChartSeriesId[];
}) {
  const m = dashboardUi.missedCallsAnalytics;
  const [hovered, setHovered] = useState<number | null>(null);
  const chartW = cfg.width;
  const chartH = cfg.height;
  const innerW = chartW - PAD.l - PAD.r;
  const innerH = chartH - PAD.t - PAD.b;
  const gridStroke = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const labelFill = dark ? "#94a3b8" : "#64748b";
  const maxY = Math.max(1, maxVisibleValue(data, visible));
  const ticks = yAxisTicks(maxY);
  const labelIndices = pickAxisLabelIndices(data.length, Math.min(data.length, cfg.maxLabels));

  const xAt = (i: number) =>
    PAD.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);

  const coords: PlotCoord[] = useMemo(() => {
    return data.map((d, i) => {
      const x = xAt(i);
      const topValue = Math.max(0, ...visible.map((id) => getTrendChartPlotValue(d, id)));
      const y = PAD.t + innerH - (topValue / maxY) * innerH;
      return {
        x,
        y,
        d,
        i,
        leftPct: (x / chartW) * 100,
        topPct: (y / chartH) * 100,
      };
    });
  }, [data, visible, innerW, innerH, maxY, chartW, chartH]);

  const seriesLines = useMemo(() => {
    return visible.map((id) => {
      const def = trendSeriesDef(id);
      const nodes = data.map((d, i) => {
        const v = getTrendChartPlotValue(d, id);
        const x = xAt(i);
        const y = PAD.t + innerH - (v / maxY) * innerH;
        return { x, y, v, i };
      });
      const points = nodes.map((n) => `${n.x},${n.y}`).join(" ");
      return { id, color: def.color, points, nodes };
    });
  }, [data, visible, innerW, innerH, maxY]);

  const active = hovered !== null ? coords[hovered] : null;
  const activeSeriesId = visible[0];

  const handlePlotMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered(indexFromPlotX(e.clientX, rect, data.length, PAD.l, innerW, chartW));
  };

  return (
    <div
      className="vow-missed-chart-plot relative w-full cursor-crosshair"
      style={{ aspectRatio: `${chartW} / ${chartH}` }}
      onMouseMove={handlePlotMove}
      onMouseLeave={() => setHovered(null)}
      role="presentation"
    >
      {active ? (
        <ChartTooltipCard
          point={active.d}
          dark={dark}
          leftPct={active.leftPct}
          topPct={active.topPct}
          visible={visible}
        />
      ) : null}

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full select-none"
        role="img"
        aria-label={m.chartAria}
      >
        {ticks.map((tick) => {
          const y = PAD.t + innerH - (tick / maxY) * innerH;
          return (
            <g key={tick}>
              <line
                x1={PAD.l}
                x2={chartW - PAD.r}
                y1={y}
                y2={y}
                stroke={gridStroke}
                strokeDasharray={tick === 0 ? undefined : "4 4"}
              />
              <text x={PAD.l - 10} y={y + 4} textAnchor="end" fontSize={10} fill={labelFill}>
                {tick}
              </text>
            </g>
          );
        })}
        {seriesLines.map((line) => (
          <g key={line.id}>
            <polyline
              fill="none"
              stroke={line.color}
              strokeWidth={visible.length > 1 ? 2 : 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              points={line.points}
              opacity={visible.length > 1 ? 0.92 : 1}
            />
            {line.nodes.map((node) => {
              const isActive = hovered === node.i;
              const r = isActive ? 5.5 : node.v > 0 ? 4 : 3;
              return (
                <circle
                  key={`${line.id}-${node.i}`}
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={line.color}
                  stroke={dark ? "#2a221c" : "#fff"}
                  strokeWidth={isActive ? 2.5 : 2}
                  vectorEffect="non-scaling-stroke"
                  opacity={node.v > 0 ? 1 : isActive ? 1 : 0.55}
                />
              );
            })}
          </g>
        ))}
        {active && activeSeriesId ? (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD.t}
            y2={PAD.t + innerH}
            stroke={trendSeriesDef(activeSeriesId).color}
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {coords.map(({ x, d, i }) =>
          labelIndices.has(i) ? (
            <text
              key={d.date}
              x={x}
              y={chartH - 16}
              textAnchor="middle"
              fontSize={10}
              fill={labelFill}
              fontWeight={500}
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function MultiSeriesBarChart({
  data,
  dark,
  cfg,
  visible,
}: {
  data: MissedCallsDailyPoint[];
  dark: boolean;
  cfg: (typeof SIZE_CONFIG)[ChartSize];
  visible: TrendChartSeriesId[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxY = Math.max(1, maxVisibleValue(data, visible));
  const labelIndices = pickAxisLabelIndices(data.length, Math.min(data.length, cfg.maxLabels));
  const active = hovered !== null ? data[hovered] : null;
  const barLeftPct =
    hovered !== null && data.length > 0 ? ((hovered + 0.5) / data.length) * 100 : 50;
  const emptyBar = dark ? "bg-white/10" : "bg-slate-200";
  const valueText = dark ? "text-slate-300" : "text-slate-600";
  const labelText = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className="relative w-full overflow-visible pt-2"
      style={{ minHeight: cfg.barHeight + 48 }}
    >
      {active ? (
        <ChartTooltipCard
          point={active}
          dark={dark}
          leftPct={barLeftPct}
          topPct={18}
          visible={visible}
        />
      ) : null}
      <div
        className="flex h-full cursor-crosshair items-end gap-0.5 sm:gap-1"
        style={{ height: cfg.barHeight + 24 }}
        onMouseLeave={() => setHovered(null)}
      >
        {data.map((d, i) => (
          <div
            key={d.date}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
            onMouseEnter={() => setHovered(i)}
          >
            <div className="flex h-[calc(100%-18px)] w-full max-w-[4rem] items-end justify-center gap-0.5">
              {visible.map((id) => {
                const def = trendSeriesDef(id);
                const raw = getTrendSeriesValue(d, id);
                const plot = getTrendChartPlotValue(d, id);
                return (
                  <div
                    key={id}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                    title={`${def.label}: ${formatTrendTooltipValue(id, raw)}`}
                  >
                    <span className={`text-[9px] font-semibold tabular-nums ${valueText}`}>
                      {plot > 0 ? raw : ""}
                    </span>
                    <div
                      className="w-full rounded-t-sm transition-opacity"
                      style={{
                        height: `${plot > 0 ? Math.max(6, (plot / maxY) * cfg.barHeight) : 3}px`,
                        backgroundColor: plot > 0 ? def.color : undefined,
                        opacity: hovered === i ? 1 : 0.85,
                      }}
                    />
                    {!plot ? <div className={`w-full rounded-t-sm ${emptyBar}`} style={{ height: 3 }} /> : null}
                  </div>
                );
              })}
            </div>
            {labelIndices.has(i) ? (
              <span className={`max-w-full truncate text-center text-[10px] font-medium ${labelText}`}>
                {d.label}
              </span>
            ) : (
              <span className="h-[14px]" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const FLUID_CHART_MIN_WIDTH = 640;
const FLUID_CHART_HEIGHT = 300;

export function MissedCallsPreventedChart({
  data,
  theme = "light",
  size = "full",
  compact,
  tall,
  fluid = false,
}: {
  data: MissedCallsDailyPoint[];
  theme?: "light" | "dark";
  size?: ChartSize;
  compact?: boolean;
  tall?: boolean;
  /** Stretch plot to container width (analytics full-width layout) */
  fluid?: boolean;
}) {
  const m = dashboardUi.missedCallsAnalytics;
  const resolvedSize: ChartSize = compact ? (tall ? "home" : "compact") : size;
  const containerRef = useRef<HTMLDivElement>(null);
  const [fluidWidth, setFluidWidth] = useState(SIZE_CONFIG.full.width);

  useEffect(() => {
    if (!fluid || resolvedSize !== "full") return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setFluidWidth(Math.max(FLUID_CHART_MIN_WIDTH, Math.floor(w)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fluid, resolvedSize]);

  const cfg = useMemo(() => {
    const base = SIZE_CONFIG[resolvedSize];
    if (!fluid || resolvedSize !== "full") return base;
    return {
      ...base,
      width: fluidWidth,
      height: FLUID_CHART_HEIGHT,
      maxLabels: Math.min(14, Math.max(8, Math.floor(fluidWidth / 72))),
      barHeight: 220,
    };
  }, [resolvedSize, fluid, fluidWidth]);

  const dark = theme === "dark";
  const [visibleSeries, setVisibleSeries] = useState<TrendChartSeriesId[]>(
    DEFAULT_TREND_SERIES_VISIBLE,
  );

  const prepared = useMemo(() => prepareMissedCallsChartData(data), [data]);

  if (prepared.data.length === 0) {
    return (
      <p className={`flex min-h-[200px] items-center justify-center text-sm text-slate-500 ${cfg.containerClass}`}>
        {m.chartEmpty}
      </p>
    );
  }

  return (
    <div ref={containerRef} className={cfg.containerClass}>
      <SeriesLegend
        visible={visibleSeries}
        dark={dark}
        onToggle={(id) => setVisibleSeries((prev) => toggleTrendSeries(prev, id))}
      />
      <p
        className={`mb-2 min-h-[1rem] text-right text-[10px] font-medium ${
          dark ? "text-slate-500" : "text-slate-400"
        } ${prepared.granularityHint ? "" : "invisible"}`}
        aria-hidden={!prepared.granularityHint}
      >
        {prepared.granularityHint ?? "\u00a0"}
      </p>
      {prepared.mode === "line" ? (
        <MultiSeriesLineChart
          data={prepared.data}
          dark={dark}
          cfg={cfg}
          visible={visibleSeries}
        />
      ) : (
        <MultiSeriesBarChart
          data={prepared.data}
          dark={dark}
          cfg={cfg}
          visible={visibleSeries}
        />
      )}
    </div>
  );
}
