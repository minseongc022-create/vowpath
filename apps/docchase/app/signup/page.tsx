"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { SITE } from "@/lib/site";
import { createDemoState, saveState } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState("바른세무회계사무소");
  const [ownerName, setOwnerName] = useState("이서연");
  const [email, setEmail] = useState("demo@suimcheck.kr");

  function startDemo(e: React.FormEvent) {
    e.preventDefault();
    const state = createDemoState();
    state.profile.officeName = officeName.trim() || state.profile.officeName;
    state.profile.ownerName = ownerName.trim() || state.profile.ownerName;
    state.profile.email = email.trim() || state.profile.email;
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
      <main className="sc-container flex min-h-[70vh] items-center py-12">
        <div className="mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">시작</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              데모 사무소로 {SITE.name}를 열어보세요.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted sm:text-base">
              수임처 예시 데이터가 채워진 현황판이 바로 열립니다. 실제 알림톡 연동 전에는 발송이
              시뮬레이션됩니다.
            </p>
          </div>
          <form onSubmit={startDemo} className="sc-card p-6 sm:p-8">
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
              현황판 열기
            </button>
            <p className="mt-4 text-center text-xs text-ink-muted">
              이미 데모가 있으신가요?{" "}
              <Link href="/login" className="font-semibold text-pine-700">
                로그인
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
