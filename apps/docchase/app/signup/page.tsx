"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { PLANS, type PlanId } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { createDemoState, saveState } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState("바른세무회계사무소");
  const [ownerName, setOwnerName] = useState("이서연");
  const [email, setEmail] = useState("demo@suimcheck.kr");
  const [plan, setPlan] = useState<PlanId>("standard");

  function startDemo(e: React.FormEvent) {
    e.preventDefault();
    const state = createDemoState(plan);
    state.profile.officeName = officeName.trim() || state.profile.officeName;
    state.profile.ownerName = ownerName.trim() || state.profile.ownerName;
    state.profile.email = email.trim() || state.profile.email;
    state.profile.plan = plan;
    saveState(state);
    window.localStorage.setItem(
      "suimcheck.session",
      JSON.stringify({ email: state.profile.email, at: Date.now() }),
    );
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">시작</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            사무소 규모에 맞는 플랜으로 {SITE.name} 열기
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            카드 없이 데모로 바로 확인합니다. 클로브처럼 수임처 앱을 강요하지 않습니다.
          </p>

          <form onSubmit={startDemo} className="mt-8 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    plan === p.id
                      ? "border-pine-600 bg-ink text-paper shadow-soft"
                      : "border-paper-line bg-paper-card hover:border-pine-300"
                  }`}
                >
                  <p className={`text-sm font-semibold ${plan === p.id ? "text-pine-200" : "text-pine-700"}`}>
                    {p.name}
                  </p>
                  <p className="mt-2 font-display text-2xl font-medium">
                    {p.priceLabel}
                    <span className={`ml-1 text-sm font-sans ${plan === p.id ? "text-paper/60" : "text-ink-muted"}`}>
                      원/월
                    </span>
                  </p>
                  <p className={`mt-1 text-xs ${plan === p.id ? "text-paper/70" : "text-ink-muted"}`}>
                    {p.audience}
                  </p>
                  <p className={`mt-2 text-xs leading-relaxed ${plan === p.id ? "text-paper/75" : "text-ink-muted"}`}>
                    {p.blurb}
                  </p>
                </button>
              ))}
            </div>

            <div className="sc-card p-5 sm:p-6">
              <label className="sc-label" htmlFor="office">
                사무소명
              </label>
              <input
                id="office"
                className="sc-input"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                required
              />
              <label className="sc-label mt-4" htmlFor="owner">
                담당자
              </label>
              <input
                id="owner"
                className="sc-input"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
              <label className="sc-label mt-4" htmlFor="email">
                이메일
              </label>
              <input
                id="email"
                type="email"
                className="sc-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="sc-btn-primary mt-6 w-full py-3">
                {getPlanName(plan)}로 현황판 열기
              </button>
              <p className="mt-4 text-center text-xs text-ink-muted">
                이미 데모가 있으신가요?{" "}
                <Link href="/login" className="font-semibold text-pine-700">
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

function getPlanName(id: PlanId) {
  return PLANS.find((p) => p.id === id)?.name || "스탠다드";
}
