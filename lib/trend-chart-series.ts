import type { MissedCallsDailyPoint } from "./missed-calls-analytics";

import { isEnglishUi } from "./locale";



export type TrendChartSeriesId =

  | "callsSaved"

  | "waitingCustomers"

  | "emergency"

  | "bookedJobs"

  | "inboundCalls";



export type TrendChartSeriesDef = {

  id: TrendChartSeriesId;

  label: string;

  shortHint: string;

  color: string;

  description: string;

};



const OWNER_KPI_SERIES_EN: TrendChartSeriesDef[] = [

  {

    id: "callsSaved",

    label: "Leads captured",

    shortHint: "Calls you would have missed",

    color: "#38bdf8",

    description: "Customers Effiroad saved from voicemail or hang-ups",

  },

  {

    id: "waitingCustomers",

    label: "Awaiting your reply",

    shortHint: "Reply 1 or 2",

    color: "#fbbf24",

    description: "Requests waiting for your text reply (1 or 2)",

  },

  {

    id: "emergency",

    label: "Emergency requests",

    shortHint: "Needs immediate attention",

    color: "#fb7185",

    description: "Requests classified as emergency (P1)",

  },

  {

    id: "bookedJobs",

    label: "Bookings confirmed",

    shortHint: "Approved or scheduled",

    color: "#34d399",

    description: "Requests approved, scheduled, or completed",

  },

  {

    id: "inboundCalls",

    label: "Inbound calls",

    shortHint: "Total calls received",

    color: "#a78bfa",

    description: "Inbound calls in the selected period",

  },

];



const OWNER_KPI_SERIES_KO: TrendChartSeriesDef[] = [

  {

    id: "callsSaved",

    label: "지켜낸 고객",

    shortHint: "놓칠 뻔한 고객 확보",

    color: "#38bdf8",

    description: "Effiroad가 없었다면 놓쳤을 콜·고객",

  },

  {

    id: "waitingCustomers",

    label: "대기 고객",

    shortHint: "업체 승인·거절 응답 대기",

    color: "#fbbf24",

    description: "AI가 업체에 예약 승인을 요청했으나 아직 답이 없는 고객",

  },

  {

    id: "emergency",

    label: "긴급 요청",

    shortHint: "즉시 대응 필요",

    color: "#fb7185",

    description: "AI가 긴급(P1)으로 분류한 요청",

  },

  {

    id: "bookedJobs",

    label: "예약 전환",

    shortHint: "예약 완료",

    color: "#34d399",

    description: "승인·일정·완료로 이어진 예약",

  },

  {

    id: "inboundCalls",

    label: "인바운드 콜",

    shortHint: "걸려온 전화 콜 합계",

    color: "#a78bfa",

    description: "기간 내 수신한 인바운드 통화 건수",

  },

];



export const OWNER_KPI_SERIES = isEnglishUi() ? OWNER_KPI_SERIES_EN : OWNER_KPI_SERIES_KO;



export const TREND_CHART_SERIES = OWNER_KPI_SERIES;



export const DEFAULT_TREND_SERIES_VISIBLE: TrendChartSeriesId[] = ["callsSaved"];



export function getTrendSeriesValue(

  point: MissedCallsDailyPoint,

  id: TrendChartSeriesId,

): number {

  switch (id) {

    case "callsSaved":

      return point.callsSaved;

    case "waitingCustomers":

      return point.waitingCustomers;

    case "emergency":

      return point.emergency;

    case "bookedJobs":

      return point.bookedJobs;

    case "inboundCalls":

      return point.inboundCalls;

    default:

      return 0;

  }

}



export function trendSeriesDef(id: TrendChartSeriesId): TrendChartSeriesDef {

  return OWNER_KPI_SERIES.find((s) => s.id === id)!;

}



export type TrendSeriesTotals = Record<TrendChartSeriesId, number>;



export function sumTrendSeriesTotals(daily: MissedCallsDailyPoint[]): TrendSeriesTotals {

  const totals: TrendSeriesTotals = {

    callsSaved: 0,

    waitingCustomers: 0,

    emergency: 0,

    bookedJobs: 0,

    inboundCalls: 0,

  };

  for (const point of daily) {

    totals.callsSaved += point.callsSaved;

    totals.waitingCustomers += point.waitingCustomers;

    totals.emergency += point.emergency;

    totals.bookedJobs += point.bookedJobs;

    totals.inboundCalls += point.inboundCalls;

  }

  return totals;

}

