"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDIT_COSTS, MATCHCUT_API, MATCHCUT_ROUTES } from "@/lib/matchcut/constants";
import type { MarketConnectionStatus, RegisterResult } from "@/lib/matchcut/markets/types";

export function MatchCutMarketsPanel({ initialCredits }: { initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);
  const [markets, setMarkets] = useState<MarketConnectionStatus[]>([]);
  const [channels, setChannels] = useState<string[]>(["coupang", "smartstore"]);
  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [detailHtml, setDetailHtml] = useState("<p>상세 설명</p>");
  const [results, setResults] = useState<RegisterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(MATCHCUT_API.marketsStatus);
      const data = await res.json();
      if (res.ok) setMarkets(data.markets ?? []);
    })();
  }, []);

  const toggle = (id: string) => {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(MATCHCUT_API.marketsRegister, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels,
          title,
          salePrice: Number(salePrice),
          detailHtml,
          imagesBase64: [],
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("크레딧이 부족합니다.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "등록 실패");
      setResults(data.results ?? []);
      if (data.credits) setCredits(data.credits.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">마켓 자동 등록</h1>
          <p className="text-sm text-slate-500">
            쿠팡·스마트스토어·11번가·G마켓 등 — API 연결 시 자동 등록, 없으면 드래프트 JSON
          </p>
        </div>
        <span className="rounded-full bg-trust-100 px-3 py-1 text-sm font-semibold text-trust-800">
          {credits.toLocaleString()} 크레딧
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">연동 상태</h2>
        <ul className="mt-3 space-y-2">
          {markets.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm"
            >
              <span className="font-medium">{m.label}</span>
              <span
                className={
                  m.connected
                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                }
              >
                {m.connected ? "LIVE" : "드래프트"}
              </span>
              <span className="w-full text-xs text-slate-500">{m.hint}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          스튜디오에서 상세컷·가격 추천 후 등록하면 이미지가 함께 들어갑니다.{" "}
          <Link href={MATCHCUT_ROUTES.app} className="text-trust-600 underline">
            스튜디오로
          </Link>
        </p>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold">수동 등록 (제목·가격)</h2>
        <div className="flex flex-wrap gap-2">
          {markets.map((m) => (
            <label key={m.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={channels.includes(m.id)}
                onChange={() => toggle(m.id)}
              />
              {m.label}
            </label>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="상품명"
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          placeholder="판매가"
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />
        <textarea
          value={detailHtml}
          onChange={(e) => setDetailHtml(e.target.value)}
          rows={4}
          className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-trust-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading
            ? "등록 중…"
            : `등록 / 드래프트 (${channels.length * CREDIT_COSTS.marketRegister} 크레딧)`}
        </button>
      </section>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {results.length > 0 && (
        <section className="mt-6 space-y-3">
          {results.map((r) => (
            <div key={r.channel} className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-semibold">
                {r.channel} · {r.status}
                {r.externalId ? ` · #${r.externalId}` : ""}
              </p>
              <p className="mt-1 text-slate-600">{r.message}</p>
              {r.draft && (
                <button
                  type="button"
                  className="mt-2 text-trust-600 underline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(r.draft, null, 2)], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `matchcut-${r.channel}-draft.json`;
                    a.click();
                  }}
                >
                  드래프트 JSON 다운로드
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
