"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { PLANS, type PlanId } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { createDemo, saveState } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("한빛인테리어");
  const [ownerName, setOwnerName] = useState("정우진");
  const [email, setEmail] = useState("demo@chugahwak.kr");
  const [plan, setPlan] = useState<PlanId>("standard");

  function start(e: React.FormEvent) {
    e.preventDefault();
    const state = createDemo(plan);
    state.profile.companyName = companyName.trim() || state.profile.companyName;
    state.profile.ownerName = ownerName.trim() || state.profile.ownerName;
    state.profile.email = email.trim() || state.profile.email;
    state.profile.plan = plan;
    saveState(state);
    localStorage.setItem("chugahwak.session", JSON.stringify({ email: state.profile.email, at: Date.now() }));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-steel-700">시작</p>
          <h1 className="mt-3 font-display text-3xl font-medium text-ink sm:text-4xl">
            {SITE.name} 데모 열기
          </h1>
          <p className="mt-3 text-sm text-ink-muted">플랜을 고르고 미승인 추가공사부터 확인하세요.</p>

          <form onSubmit={start} className="mt-8 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`rounded-2xl border p-4 text-left ${
                    plan === p.id ? "border-steel-600 bg-ink text-white" : "border-paper-line bg-paper-card"
                  }`}
                >
                  <p className={`text-sm font-semibold ${plan === p.id ? "text-signal" : "text-steel-700"}`}>
                    {p.name}
                  </p>
                  <p className="mt-2 font-display text-2xl">{p.priceLabel}원</p>
                  <p className={`mt-1 text-xs ${plan === p.id ? "text-white/70" : "text-ink-muted"}`}>{p.blurb}</p>
                </button>
              ))}
            </div>
            <div className="sc-card p-5 sm:p-6">
              <label className="sc-label" htmlFor="co">
                상호
              </label>
              <input id="co" className="sc-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              <label className="sc-label mt-4" htmlFor="owner">
                담당자
              </label>
              <input id="owner" className="sc-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
              <label className="sc-label mt-4" htmlFor="email">
                이메일
              </label>
              <input id="email" type="email" className="sc-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" className="sc-btn-primary mt-6 w-full py-3">
                현황판 열기
              </button>
              <p className="mt-4 text-center text-xs text-ink-muted">
                이미 데모가 있나요?{" "}
                <Link href="/login" className="font-semibold text-steel-700">
                  로그인
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
