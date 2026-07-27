"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Shell";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: mode === "signup" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, shopName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      router.push("/app");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-40" />
      <div className="glass chrome-border relative w-full max-w-md rounded-3xl p-8 shadow-glow">
        <div className="absolute inset-x-0 top-0 h-px shimmer-bar" />
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold text-white">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          {mode === "signup" ? "14-day free trial. No credit card." : "Sign in to ClosePing."}
        </p>
        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
          {mode === "signup" ? (
            <input
              className="input-dark"
              placeholder="Shop name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          ) : null}
          <input
            className="input-dark"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-dark"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-chrome w-full disabled:opacity-50">
            {busy ? "…" : mode === "signup" ? "Start free trial" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-500">
          {mode === "signup" ? (
            <>
              Have an account?{" "}
              <Link href="/login" className="text-white hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="text-white hover:underline">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
