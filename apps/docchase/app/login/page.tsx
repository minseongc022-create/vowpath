"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { loadState } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@suimcheck.kr");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const state = loadState();
    window.localStorage.setItem(
      "suimcheck.session",
      JSON.stringify({ email: email.trim() || state.profile.email, at: Date.now() }),
    );
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container flex min-h-[70vh] items-center justify-center py-12">
        <form onSubmit={onSubmit} className="sc-card w-full max-w-md p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink">로그인</h1>
          <p className="mt-2 text-sm text-ink-muted">
            데모는 비밀번호 없이 이메일만으로 현황판에 들어갑니다.
          </p>
          <label className="sc-label mt-6" htmlFor="email">
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
            현황판으로
          </button>
          <p className="mt-4 text-center text-xs text-ink-muted">
            처음이신가요?{" "}
            <Link href="/signup" className="font-semibold text-pine-700">
              데모 시작
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
