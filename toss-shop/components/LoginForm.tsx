"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

export function LoginForm() {
  const router = useRouter();
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

  function fillDemo() {
    setEmail(SP_STRINGS.demoEmail);
    setPassword(SP_STRINGS.demoPassword);
    setMode("login");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="ts-card">
        <p className="text-xs font-semibold text-ts-primary">{SP_STRINGS.brandEn}</p>
        <h1 className="text-xl font-bold text-ts-ink">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mt-1 text-sm text-ts-muted">{SP_STRINGS.brand} · {SP_STRINGS.syncInterval}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ts-muted">이름</label>
                <input className="ts-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ts-muted">상점명</label>
                <input className="ts-input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ts-muted">이메일</label>
            <input
              type="email"
              className="ts-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ts-muted">비밀번호</label>
            <input
              type="password"
              className="ts-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="ts-btn-primary w-full">
            {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={fillDemo} className="text-ts-primary font-semibold hover:underline">
            {SP_STRINGS.ctaDemo}
          </button>
          <span className="text-ts-muted">·</span>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-ts-muted hover:text-ts-ink"
          >
            {mode === "login" ? "회원가입" : "로그인으로"}
          </button>
        </div>
      </div>
    </div>
  );
}
