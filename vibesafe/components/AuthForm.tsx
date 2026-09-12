"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type Mode = "signup" | "login";

/**
 * 가입과 로그인은 같은 폼이다. 다른 건 문구와 보내는 주소뿐이라 따로 만들면
 * 한쪽만 고치는 실수가 난다.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vibesafe/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { email, password, name } : { email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "잠시 후 다시 시도해주세요.");
        setBusy(false);
        return;
      }
      // replace — 뒤로가기로 가입 화면에 되돌아오지 않게.
      router.replace(data.redirect ?? "/vibesafe/dashboard");
      router.refresh();
    } catch {
      setError("연결에 실패했습니다. 네트워크를 확인해주세요.");
      setBusy(false);
    }
  }

  return (
    <div className="vs-container-narrow">
      <div className="vs-stack">
        <div>
          <h1 className="vs-page-title">{isSignup ? "VibeSafe 시작하기" : "로그인"}</h1>
          <p className="vs-page-sub">
            {isSignup
              ? "이메일만 있으면 됩니다. 카드 등록은 없습니다."
              : "가입할 때 쓴 이메일로 로그인하세요."}
          </p>
        </div>

        <form className="vs-card vs-stack" onSubmit={submit}>
          {isSignup && (
            <div className="vs-field">
              <label className="vs-label" htmlFor="vs-name">
                이름 <span style={{ fontWeight: 400, color: "var(--vs-muted)" }}>(선택)</span>
              </label>
              <input
                id="vs-name"
                className="vs-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="홍길동"
              />
            </div>
          )}

          <div className="vs-field">
            <label className="vs-label" htmlFor="vs-email">
              이메일
            </label>
            <input
              id="vs-email"
              className="vs-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              inputMode="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="vs-field">
            <label className="vs-label" htmlFor="vs-password">
              비밀번호
            </label>
            <input
              id="vs-password"
              className="vs-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              placeholder={isSignup ? "8자 이상" : ""}
            />
            {isSignup && <p className="vs-hint">8자 이상이면 됩니다.</p>}
          </div>

          {error && (
            <div className="vs-alert" data-tone="error" role="alert">
              {error}
            </div>
          )}

          <button className="vs-btn vs-btn-primary vs-btn-block" type="submit" disabled={busy}>
            {busy ? "처리 중…" : isSignup ? "가입하고 시작하기" : "로그인"}
          </button>

          <p className="vs-hint" style={{ textAlign: "center" }}>
            {isSignup ? (
              <>
                이미 계정이 있나요? <Link href="/vibesafe/login">로그인</Link>
              </>
            ) : (
              <>
                아직 계정이 없나요? <Link href="/vibesafe/signup">가입하기</Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
