import "server-only";

import { scheduleDajeongPlan } from "./schedule-engine";
import type { DajeongPlan, WeatherContext, WeatherDay, WeatherHour } from "./types";

const REGION_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  서울: { latitude: 37.5665, longitude: 126.9780 }, 성수: { latitude: 37.5446, longitude: 127.0559 }, 강남: { latitude: 37.4979, longitude: 127.0276 },
  홍대: { latitude: 37.5563, longitude: 126.9237 }, 연남: { latitude: 37.5660, longitude: 126.9250 }, 인천: { latitude: 37.4563, longitude: 126.7052 },
  수원: { latitude: 37.2636, longitude: 127.0286 }, 강릉: { latitude: 37.7519, longitude: 128.8761 }, 부산: { latitude: 35.1796, longitude: 129.0756 },
  제주: { latitude: 33.4996, longitude: 126.5312 }, 속초: { latitude: 38.2070, longitude: 128.5918 }, 경주: { latitude: 35.8562, longitude: 129.2247 },
};

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
    precipitation?: number[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    wind_speed_10m?: number[];
    snowfall?: number[];
  };
};

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function endDate(plan: DajeongPlan): string {
  const date = new Date(`${plan.situation.targetDate}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, (plan.situation.tripDays ?? 1) - 1));
  return localDate(date);
}

function unavailable(status: WeatherContext["status"], message: string): WeatherContext {
  return { status, sourceLabel: status === "outside_forecast" ? "예보 가능 기간 밖" : "날씨 서비스 확인 실패", days: [], message };
}

function impact(hours: WeatherHour[]): WeatherDay["impact"] {
  const rain = Math.max(0, ...hours.map((hour) => hour.precipitationProbability ?? 0));
  const wind = Math.max(0, ...hours.map((hour) => hour.windKph ?? 0));
  const snow = hours.reduce((sum, hour) => sum + (hour.snowfallCm ?? 0), 0);
  if (rain >= 70 || wind >= 40 || snow >= 1) return "high";
  if (rain >= 40 || wind >= 28 || snow > 0) return "medium";
  return "low";
}

function normalize(data: OpenMeteoResponse, startDate: string, lastDate: string): WeatherDay[] {
  const hourly = data.hourly;
  const times = hourly?.time ?? [];
  const grouped = new Map<string, WeatherHour[]>();
  times.forEach((time, index) => {
    const date = time.slice(0, 10);
    if (date < startDate || date > lastDate) return;
    const item: WeatherHour = {
      time: time.slice(11, 16),
      precipitationProbability: hourly?.precipitation_probability?.[index],
      precipitationMm: hourly?.precipitation?.[index],
      temperatureC: hourly?.temperature_2m?.[index],
      apparentTemperatureC: hourly?.apparent_temperature?.[index],
      windKph: hourly?.wind_speed_10m?.[index],
      snowfallCm: hourly?.snowfall?.[index],
    };
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  });
  return [...grouped.entries()].map(([date, hours]) => ({
    date,
    hours,
    precipitationProbabilityMax: Math.max(0, ...hours.map((hour) => hour.precipitationProbability ?? 0)),
    precipitationMm: hours.reduce((sum, hour) => sum + (hour.precipitationMm ?? 0), 0),
    windKphMax: Math.max(0, ...hours.map((hour) => hour.windKph ?? 0)),
    temperatureMinC: Math.min(...hours.map((hour) => hour.temperatureC ?? Number.POSITIVE_INFINITY).filter(Number.isFinite)),
    temperatureMaxC: Math.max(...hours.map((hour) => hour.temperatureC ?? Number.NEGATIVE_INFINITY).filter(Number.isFinite)),
    impact: impact(hours),
  }));
}

export async function fetchWeatherContext(plan: DajeongPlan): Promise<WeatherContext> {
  const coordinates = REGION_COORDINATES[plan.situation.region] ?? Object.entries(REGION_COORDINATES).find(([region]) => plan.situation.region.includes(region))?.[1];
  if (!coordinates) return unavailable("unavailable", `${plan.situation.region}의 예보 위치를 정확히 연결하지 못했어.`);
  const start = plan.situation.targetDate;
  const finish = endDate(plan);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${start}T12:00:00`);
  const distance = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (distance < 0 || distance > 15) return unavailable("outside_forecast", "현재 신뢰할 수 있는 시간대별 예보 범위 밖이라 날씨를 확정하지 않았어.");
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude), longitude: String(coordinates.longitude), timezone: "Asia/Seoul", start_date: start, end_date: finish,
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,wind_speed_10m",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(5_000), next: { revalidate: 1800 } });
    if (!response.ok) return unavailable("unavailable", "날씨 서비스가 응답하지 않아 예보를 일정에 확정 반영하지 않았어.");
    const days = normalize(await response.json() as OpenMeteoResponse, start, finish);
    if (!days.length) return unavailable("unavailable", "시간대별 예보를 받지 못해 날씨를 확정하지 않았어.");
    return {
      status: "verified", sourceLabel: "Open-Meteo", sourceUrl: "https://open-meteo.com/", checkedAt: new Date().toISOString(), days,
      message: "시간대별 강수·기온·체감온도·바람을 확인해 장소와 이동 노출을 함께 검토했어.",
    };
  } catch {
    return unavailable("unavailable", "날씨 데이터를 확인하지 못해 기존 일정에 임의의 예보를 적용하지 않았어.");
  }
}

/**
 * 이미 받아 둔 날씨 정보를 계획에 합친다. fetchWeatherContext 자체는 실제 장소 검색과
 * 무관해서 라우트 쪽에서 Promise.all로 동시에 미리 받아둘 수 있다 — 그 경우 이 함수로
 * 합치기만 하면 된다(순서대로 다시 기다릴 필요가 없다).
 */
export function applyWeatherContext(plan: DajeongPlan, weather: WeatherContext): DajeongPlan {
  return scheduleDajeongPlan({ ...plan, schedule: { ...(plan.schedule ?? { density: plan.situation.scheduleDensity, dayWindows: [], estimatedEndTime: plan.situation.startTime, reserveRatio: .85, warnings: [] }), weather } });
}

export async function enrichPlanWithWeather(plan: DajeongPlan): Promise<DajeongPlan> {
  const weather = await fetchWeatherContext(plan);
  return applyWeatherContext(plan, weather);
}
