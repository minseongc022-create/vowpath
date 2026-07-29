"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CREDIT_COSTS,
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  TOPUP_PACK,
  estimateRunCredits,
  type CreditPack,
} from "@/lib/matchcut/constants";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";
import { matchCutPricingFaq } from "@/lib/matchcut/content-ko";

function PackCard({
  pack,
  onBuy,
  loading,
  subscribed,
}: {
  pack: CreditPack;
  onBuy?: (id: string) => void;
  loading?: boolean;
  subscribed?: boolean;
}) {
  const perCredit = Math.round(pack.priceKrw / pack.credits);
  const runs = Math.floor(pack.credits / estimateRunCredits(3));

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {pack.badge && (
        <span className="absolute -top-3 right-4 rounded-full bg-trust-600 px-3 py-0.5 text-xs font-bold text-white">
          {pack.badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{pack.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{pack.description}</p>
      <p className="mt-4 text-3xl font-bold text-slate-900">
        {pack.priceKrw.toLocaleString()}
        <span className="text-base font-normal text-slate-500">원</span>
        {pack.type === "subscription" && (
          <span className="text-base font-normal text-slate-500">/월</span>
        )}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>{pack.credits.toLocaleString()} 크레딧</li>
        <li>크레딧당 약 {perCredit}원</li>
        <li>소싱 약 {runs}건 (매칭+컷3 기준)</li>
      </ul>
      {onBuy && (
        <button
          type="button"
          disabled={loading || (pack.type === "topup" && !subscribed)}
          onClick={() => onBuy(pack.id)}
          className="mt-6 w-full rounded-xl bg-trust-600 py-2.5 text-sm font-semibold text-white hover:bg-trust-700 disabled:opacity-50"
        >
          {pack.type === "topup" && !subscribed ? "구독 후 구매" : "충전하기"}
        </button>
      )}
    </div>
  );
}

export function MatchCutPricingPage({ session }: { session?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const buy = async (packId: string) => {
    if (!session) {
      window.location.href = MATCHCUT_ROUTES.signup;
      return;
    }
    setLoading(packId);
    setMessage(null);
    try {
      const res = await fetch("/api/matchcut/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "결제 실패");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMessage(data.message ?? "충전 완료");
      if (data.credits) {
        // refresh soft
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">투명한 크레딧 요금제</h1>
        <p className="mt-3 text-slate-600">
          크리에이지처럼 구독(월 초기화) + 단건(영구) 구조. 내보내기는 무료.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-trust-100 bg-trust-50/60 p-6">
        <h2 className="font-semibold text-trust-900">크레딧 소모량</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-white p-4">
            <p className="font-medium">옵션 매칭</p>
            <p className="text-2xl font-bold text-trust-700">{CREDIT_COSTS.match}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="font-medium">AI 상세컷 1장</p>
            <p className="text-2xl font-bold text-trust-700">{CREDIT_COSTS.angle}</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="font-medium">ZIP/HTML 내보내기</p>
            <p className="text-2xl font-bold text-emerald-600">무료</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-trust-800">
          1건 풀세트 (매칭 + 컷 3장) = {estimateRunCredits(3)} 크레딧
        </p>
      </div>

      <h2 className="mt-14 text-xl font-bold text-slate-900">월 구독</h2>
      <p className="mt-1 text-sm text-slate-500">매월 크레딧 자동 충전 · 30일마다 초기화</p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((p) => (
          <PackCard key={p.id} pack={p} onBuy={buy} loading={loading === p.id} />
        ))}
      </div>

      <h2 className="mt-14 text-xl font-bold text-slate-900">단건 크레딧</h2>
      <p className="mt-1 text-sm text-slate-500">영구 보관 · 만료 없음</p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {CREDIT_PACKS.map((p) => (
          <PackCard key={p.id} pack={p} onBuy={buy} loading={loading === p.id} />
        ))}
      </div>

      <h2 className="mt-14 text-xl font-bold text-slate-900">구독 회원 추가 충전</h2>
      <div className="mt-6 max-w-sm">
        <PackCard pack={TOPUP_PACK} onBuy={buy} loading={loading === TOPUP_PACK.id} />
      </div>

      {message && (
        <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      )}

      <div className="mt-16 space-y-6">
        <h2 className="text-xl font-bold">자주 묻는 질문</h2>
        {matchCutPricingFaq.map((f) => (
          <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">{f.q}</p>
            <p className="mt-2 text-sm text-slate-600">{f.a}</p>
          </div>
        ))}
      </div>

      {!session && (
        <div className="mt-12 text-center">
          <Link
            href={MATCHCUT_ROUTES.signup}
            className="inline-block rounded-xl bg-trust-600 px-8 py-3 font-semibold text-white hover:bg-trust-700"
          >
            무료 30크레딧으로 시작
          </Link>
        </div>
      )}
    </div>
  );
}
