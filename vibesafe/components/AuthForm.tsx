"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "signup" | "login";

const GITHUB_ERROR_MESSAGES: Record<string, string> = {
  email_taken:
    "이미 이 이메일로 가입된 계정이 있습니다. 이메일로 로그인한 뒤, 계정 화면에서 GitHub를 연결해주세요.",
  state: "요청이 만료됐거나 유효하지 않습니다. 다시 시도해주세요.",
  installation: "GitHub 설치 정보를 확인하지 못했습니다. 다시 시도해주세요.",
  oauth: "GitHub 인증에 실패했습니다. 다시 시도해주세요.",
  connect: "GitHub 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
};

/**
 * 가입과 로그인은 같은 폼이다. 다른 건 문구와 보내는 주소뿐이라 따로 만들면
 * 한쪽만 고치는 실수가 난다.
 */
export function AuthForm({ mode, githubAvailable }: { mode: Mode; githubAvailable: boolean }) {
  const searchParams = useSearchParams();
  const githubError = searchParams.get("github_error");
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
      // 로그인은 세션 쿠키가 생기는 순간이라 서버 렌더를 처음부터 다시 받아야
      // 한다. router.replace() 뒤에 router.refresh()를 붙이는 방식도 되지만,
      // 두 호출이 겹치면 이동이 취소될 수 있는 알려진 경합이 있어 전체 페이지
      // 이동을 쓴다 — 인증 전환은 자주 일어나는 일이 아니라 이 비용이 아깝지 않다.
      window.location.replace(data.redirect ?? "/vibesafe/dashboard");
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

        {githubError && (
          <div className="vs-alert" data-tone="warn" role="alert">
            {GITHUB_ERROR_MESSAGES[githubError] ?? "GitHub 연결 중 문제가 발생했습니다."}
          </div>
        )}

        {githubAvailable && (
          <div className="vs-card vs-stack-sm">
            <a
              className="vs-btn vs-btn-primary vs-btn-block vs-btn-lg"
              href="/api/vibesafe/github/install?intent=signup"
            >
              {isSignup ? "GitHub로 계속하기" : "GitHub로 로그인"}
            </a>
            {isSignup && (
              <p className="vs-hint" style={{ textAlign: "center" }}>
                비밀번호 없이 한 번에 가입과 저장소 연결이 끝납니다.
              </p>
            )}
            <div className="vs-row" style={{ alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, height: 1, background: "var(--vs-line)" }} />
              <span className="vs-hint" style={{ margin: 0 }}>
                또는
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--vs-line)" }} />
            </div>
          </div>
        )}

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

          {isSignup && (
            <p className="vs-hint" style={{ textAlign: "center" }}>
              가입하면 <Link href="/vibesafe/terms">이용약관</Link>과{" "}
              <Link href="/vibesafe/privacy">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
            </p>
          )}

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
