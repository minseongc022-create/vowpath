"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { DAJEONG_BRAND } from "../lib/brand";
import { manualDefaults, type ManualPick } from "../lib/manual-plan";
import { savePlan } from "../lib/storage";
import type { DajeongPlan, PlanCategory } from "../lib/types";
import { ArrowIcon, CategoryIcon, ClockIcon, MapPinIcon, PlusIcon, SparkleIcon, TrashIcon } from "./DajeongIcons";

type FoundPlace = {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  phoneNumber?: string;
  mapsUrl: string;
  sourceLabel?: string;
  signals: string[];
  estimatedPrice: number;
  category: PlanCategory;
};

/**
 * 종류는 힌트일 뿐 거쳐야 하는 단계가 아니다. 말로 "꽃집 찾아줘"라고 하면 그걸로 끝이어야 하고,
 * 종류를 고르는 건 결과가 엉뚱할 때 범위를 좁히는 수단으로만 남긴다. 그래서 기본값이 '알아서'다.
 */
const CATEGORIES: Array<{ value: PlanCategory | "auto"; label: string }> = [
  { value: "auto", label: "알아서" },
  { value: "meal", label: "식당" },
  { value: "cafe", label: "카페" },
  { value: "activity", label: "체험·전시" },
  { value: "view", label: "전망·산책" },
  { value: "flower", label: "꽃집" },
  { value: "gift", label: "선물·소품" },
  { value: "cake", label: "케이크" },
  { value: "lodging", label: "숙소" },
];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PlanBuilderWorkspace() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [targetDate, setTargetDate] = useState(todayIso());
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState<PlanCategory | "auto">("auto");
  const [wish, setWish] = useState("");
  const [found, setFound] = useState<FoundPlace[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [picks, setPicks] = useState<ManualPick[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function findPlaces(event?: FormEvent) {
    event?.preventDefault();
    if (!region.trim()) {
      setError("어느 지역에서 찾을지 먼저 알려줘.");
      return;
    }
    setSearching(true);
    setError("");
    setFound([]);
    setSearchMessage("");
    try {
      const response = await fetch("/api/dajeong/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region.trim(),
          category: category === "auto" ? undefined : category,
          query: wish.trim() || undefined,
          budget: Number(budget) > 0 ? Number(budget) : undefined,
        }),
      });
      const data = await response.json().catch(() => ({})) as { places?: FoundPlace[]; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "장소를 못 찾았어.");
      setFound(data.places ?? []);
      setSearchMessage(data.message ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "잠시 후에 다시 해볼래?");
    } finally {
      setSearching(false);
    }
  }

  function addPlace(place: FoundPlace) {
    // 담을 때의 업종은 화면에서 고른 칩이 아니라 실제로 찾은 그 가게의 업종을 쓴다.
    const defaults = manualDefaults(place.category);
    const nextHour = 11 + picks.length * 2;
    setPicks((current) => [...current, {
      placeId: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      time: `${String(Math.min(22, nextHour)).padStart(2, "0")}:00`,
      durationMinutes: defaults.durationMinutes,
      price: place.estimatedPrice || defaults.price,
      mapsUrl: place.mapsUrl,
      phoneNumber: place.phoneNumber,
      rating: place.rating,
      reviewCount: place.reviewCount,
      sourceLabel: place.sourceLabel,
    }]);
  }

  function updatePick(index: number, patch: Partial<ManualPick>) {
    setPicks((current) => current.map((pick, i) => i === index ? { ...pick, ...patch } : pick));
  }

  function removePick(index: number) {
    setPicks((current) => current.filter((_, i) => i !== index));
  }

  async function finish() {
    if (!picks.length) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dajeong/plans/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region.trim(),
          targetDate,
          budget: Number(budget) > 0 ? Number(budget) : undefined,
          picks,
        }),
      });
      const data = await response.json().catch(() => ({})) as { plan?: DajeongPlan; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "계획을 못 만들었어.");
      savePlan(data.plan);
      router.push(`/dajeong/plan/${data.plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "잠시 후에 다시 해볼래?");
      setSaving(false);
    }
  }

  const total = picks.reduce((sum, pick) => sum + pick.price, 0);

  return (
    <div className="dj-container dj-builder-page">
      <div className="dj-plan-breadcrumb"><Link href="/dajeong">새 계획</Link> › <span>직접 만들기</span></div>

      <section className="dj-builder-hero dj-animate">
        <div>
          <span className="dj-kicker"><SparkleIcon size={15} /> 내가 고르는 하루</span>
          <h1>직접 계획을 짜 봐</h1>
          <p>
            가고 싶은 곳이 이미 있으면 여기서 직접 담으면 돼. 떠오르는 데가 없으면
            {" "}{DAJEONG_BRAND.assistantName}한테 하나씩 찾아달라고 해. 시간과 순서는 전부 네가 정하고,
            다 담으면 예약 준비까지 그대로 이어져.
          </p>
        </div>
      </section>

      <section className="dj-builder-basics dj-card">
        <div className="dj-field">
          <label htmlFor="builder-region">지역</label>
          <input id="builder-region" className="dj-input" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="예: 성수동, 송도, 광안리" />
        </div>
        <div className="dj-field">
          <label htmlFor="builder-date">날짜</label>
          <input id="builder-date" className="dj-input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </div>
        <div className="dj-field">
          <label htmlFor="builder-budget">예산 (선택)</label>
          <input id="builder-budget" className="dj-input" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} placeholder="예: 200000" />
        </div>
      </section>

      <section className="dj-builder-search dj-card">
        <div className="dj-builder-search-head">
          <span className="dj-concierge-avatar"><SparkleIcon size={18} /></span>
          <div>
            <strong>{DAJEONG_BRAND.assistantName}한테 장소를 하나씩 찾아달라고 해</strong>
            <p>말로만 해도 돼. 가게 이름을 알면 그대로, 조건만 있으면 조건 그대로 적으면 찾아줄게.</p>
          </div>
        </div>

        <p className="dj-builder-hint">결과가 엉뚱하면 종류를 골라서 범위를 좁혀. 안 골라도 돼.</p>
        <div className="dj-builder-categories" role="group" aria-label="찾을 종류(선택)">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dj-chip ${category === option.value ? "dj-chip-active" : ""}`}
              onClick={() => setCategory(option.value)}
              aria-pressed={category === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form className="dj-builder-search-form" onSubmit={findPlaces}>
          <input
            className="dj-input"
            value={wish}
            onChange={(event) => setWish(event.target.value)}
            placeholder="예: 까사올리브 / 조용하고 분위기 좋은 파스타집"
            aria-label="원하는 장소 설명"
          />
          <button type="submit" className="dj-btn dj-btn-primary" disabled={searching}>
            {searching ? "생각 중" : "찾아줘"} <SparkleIcon size={16} />
          </button>
        </form>

        {searchMessage ? <p className="dj-builder-note">{searchMessage}</p> : null}
        {error ? <p className="dj-builder-error">{error}</p> : null}

        {found.length ? (
          <div className="dj-builder-results">
            {found.map((place) => (
              <article key={place.id} className="dj-builder-result">
                <div>
                  <strong>{place.name}</strong>
                  <span><MapPinIcon size={13} /> {place.address}</span>
                  <div className="dj-builder-result-signals">
                    {place.rating ? <em>평점 {place.rating.toFixed(1)}{place.reviewCount ? ` · 리뷰 ${place.reviewCount.toLocaleString("ko-KR")}` : ""}</em> : null}
                    {place.signals.slice(0, 2).map((signal) => <em key={signal}>{signal}</em>)}
                    {place.phoneNumber ? <em>{place.phoneNumber}</em> : null}
                  </div>
                </div>
                <div className="dj-builder-result-actions">
                  <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="dj-btn dj-btn-secondary">지도에서 보기</a>
                  <button type="button" className="dj-btn dj-btn-primary" onClick={() => addPlace(place)}><PlusIcon size={16} /> 담기</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="dj-builder-picks dj-card">
        <div className="dj-builder-picks-head">
          <strong>담은 장소 {picks.length}곳</strong>
          {picks.length ? <span>예상 {total.toLocaleString("ko-KR")}원</span> : null}
        </div>

        {picks.length === 0 ? (
          <p className="dj-builder-empty">아직 담은 데가 없어. 위에서 찾아 담으면 여기에 시간 순서대로 쌓여.</p>
        ) : (
          <div className="dj-builder-pick-list">
            {picks.map((pick, index) => (
              <article key={`${pick.placeId}-${index}`} className="dj-builder-pick">
                <span className="dj-builder-pick-icon"><CategoryIcon category={pick.category} size={19} /></span>
                <div className="dj-builder-pick-main">
                  <strong>{pick.name}</strong>
                  <span>{pick.address}</span>
                  <div className="dj-builder-pick-fields">
                    <label>
                      <ClockIcon size={13} /> 시작
                      <input type="time" value={pick.time} onChange={(event) => updatePick(index, { time: event.target.value })} />
                    </label>
                    <label>
                      머무는 시간
                      <input type="number" min={10} max={1440} step={5} value={pick.durationMinutes} onChange={(event) => updatePick(index, { durationMinutes: Number(event.target.value) || 30 })} />분
                    </label>
                    <label>
                      예상 비용
                      <input type="number" min={0} step={1000} value={pick.price} onChange={(event) => updatePick(index, { price: Number(event.target.value) || 0 })} />원
                    </label>
                  </div>
                </div>
                <button type="button" className="dj-builder-pick-remove" onClick={() => removePick(index)} aria-label={`${pick.name} 빼기`}><TrashIcon size={17} /></button>
              </article>
            ))}
          </div>
        )}

        <button type="button" className="dj-btn dj-btn-primary dj-builder-finish" onClick={finish} disabled={!picks.length || saving || !region.trim()}>
          {saving ? "계획 만드는 중" : "이 계획으로 만들기"} <ArrowIcon size={17} />
        </button>
        <p className="dj-builder-trust">만들고 나면 자동 계획이랑 똑같이 말로 고치고, 예약 준비까지 이어서 할 수 있어.</p>
      </section>
    </div>
  );
}
