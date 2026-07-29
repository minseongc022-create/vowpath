"use client";

import { useState } from "react";
import Link from "next/link";
import { MATCHCUT_API, MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export function MatchCutAuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? MATCHCUT_API.signup : MATCHCUT_API.login;
      const body =
        mode === "signup"
          ? { email, password, displayName }
          : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "실패");
      window.location.href = MATCHCUT_ROUTES.app;
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="text-sm font-medium text-slate-700">이름 (스토어명)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
            placeholder="예: OO스토어"
          />
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">비밀번호</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {loading ? "처리 중…" : mode === "signup" ? "무료 30크레딧 받고 시작" : "로그인"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === "signup" ? (
          <>
            이미 계정이 있나요?{" "}
            <Link href={MATCHCUT_ROUTES.login} className="font-medium text-violet-600">
              로그인
            </Link>
          </>
        ) : (
          <>
            계정이 없나요?{" "}
            <Link href={MATCHCUT_ROUTES.signup} className="font-medium text-violet-600">
              가입하기
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
