"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegalDisclaimer } from "@/toss-shop/components/LegalDisclaimer";
import { TossSellerConnect } from "@/toss-shop/components/TossSellerConnect";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

export function LoginForm() {
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/toss-shop/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, shopName, mode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "로그인 실패");
        return;
      }
      router.push(SP_ROUTES.dashboard);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/toss-shop/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: SP_STRINGS.demoEmail,
          password: SP_STRINGS.demoPassword,
          mode: "login",
        }),
      });
      if (!res.ok) {
        setError("데모 로그인 실패");
        setShowEmail(true);
        return;
      }
      router.push(SP_ROUTES.dashboard);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ts-primary text-lg font-bold text-white">
          E
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ts-ink">{SP_STRINGS.brand}</h1>
        <p className="mt-1 text-sm text-ts-muted">{SP_STRINGS.tagline}</p>
      </div>

      <div className="ts-card space-y-5">
        <TossSellerConnect onDemo={() => void demoLogin()} />

        <button
          type="button"
          onClick={() => setShowEmail((v) => !v)}
          className="w-full cursor-pointer touch-manipulation py-1 text-center text-sm font-medium text-ts-muted hover:text-ts-ink"
        >
          {showEmail ? "이메일 로그인 접기" : "이메일로 로그인 / 회원가입"}
        </button>

        {showEmail && (
          <>
            <div className="ts-divider" />
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <>
                  <input className="ts-input" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className="ts-input" placeholder="상점명" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </>
              )}
              <input
                type="email"
                className="ts-input"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="ts-input"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="ts-btn-primary">
                {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="w-full cursor-pointer py-1 text-sm text-ts-muted hover:text-ts-ink"
              >
                {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="mt-4">
        <LegalDisclaimer />
      </div>
    </div>
  );
}
