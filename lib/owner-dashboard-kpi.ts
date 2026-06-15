import type { MissedCallsDailyPoint } from "./missed-calls-analytics";
import { isEnglishUi } from "./locale";
import {
  getTrendSeriesValue,
  type TrendChartSeriesId,
} from "./trend-chart-series";

export function formatOwnerKpiValue(id: TrendChartSeriesId, value: number): string {
  return String(value);
}

export function displayOwnerKpiValue(
  id: TrendChartSeriesId,
  value: number,
  loading?: boolean,
): string {
  if (loading) return "—";
  return formatOwnerKpiValue(id, value);
}

export function getTrendChartPlotValue(
  point: MissedCallsDailyPoint,
  id: TrendChartSeriesId,
): number {
  return getTrendSeriesValue(point, id);
}

export function formatTrendTooltipValue(
  id: TrendChartSeriesId,
  value: number,
): string {
  return isEnglishUi() ? `${value}` : `${value}건`;
}
