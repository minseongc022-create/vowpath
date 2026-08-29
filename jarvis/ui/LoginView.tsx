"use client";

/**
 * 로그인 — 사장님 한 명만 들어온다
 *
 * 옛 로그인 화면에는 데모 계정 버튼, 회원가입 폼, 토스 셀러 연결이 함께
 * 있었다. 지금은 셋 다 필요 없다 — 회원가입은 없애야 할 구멍이었고, 데모
 * 계정은 운영에서 막혀 있었으며, 토스 키는 로그인 뒤 연동 설정에서 넣는다.
 * 남길 이유가 없는 입구는 남기지 않는다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JV_ROUTES } from "../routes";

export function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // ★ 2단계 — 비밀번호가 맞아도 여기로 넘어오기 전까지는 로그인이 안 된다.
  // 사장님 휴대폰으로 간 6자리 코드를 맞혀야 실제 세션이 나간다.
  const [step, setStep] = useState<"password" | "otp">("password");

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/jarvis/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; otpRequired?: boolean };
      if (!res.ok) {
        setError(data.error ?? "로그인하지 못했습니다.");
        return;
      }
      if (data.otpRequired) {
        setStep("otp");
        return;
      }
      // 등록된 휴대폰이 없어 2단계 없이 바로 들어온 경우
      router.push(JV_ROUTES.chat);
      router.refresh();
    } catch {
      setError("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/jarvis/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "인증하지 못했습니다.");
        return;
      }
      router.push(JV_ROUTES.chat);
      router.refresh();
    } catch {
      setError("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="brand">
        <div className="mark">자</div>
        <h1>자비스</h1>
        <p>찾고, 만들고, 올리기 직전까지 알아서 합니다</p>
      </div>

      {step === "password" ? (
        <form onSubmit={submitPassword} className="card">
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="err">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "확인 중…" : "로그인"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="card">
          <p className="hint">휴대폰으로 보낸 6자리 인증번호를 입력하세요.</p>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="인증번호 6자리"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          {error && <p className="err">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "확인 중…" : "인증하고 들어가기"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setStep("password");
              setCode("");
              setError("");
            }}
          >
            처음부터 다시
          </button>
        </form>
      )}

      <style jsx global>{`
        :root {
          --jv-bg: #ffffff;
          --jv-surface: #f7f8fa;
          --jv-line: #e8eaed;
          --jv-text: #17171c;
          --jv-muted: #6b7280;
          --jv-blue: #3182f6;
          --jv-red: #e03131;
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: var(--jv-bg);
          color: var(--jv-text);
          font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Pretendard", "Malgun Gothic", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
      <style jsx>{`
        .wrap {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 380px;
          margin: 0 auto;
          padding: 24px 20px 60px;
        }
        .brand { text-align: center; margin-bottom: 28px; }
        .mark {
          width: 52px; height: 52px; margin: 0 auto;
          border-radius: 16px; background: var(--jv-blue); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 800;
        }
        h1 { font-size: 24px; font-weight: 800; margin: 14px 0 4px; letter-spacing: -0.4px; }
        .brand p { font-size: 14px; color: var(--jv-muted); margin: 0; line-height: 1.5; }
        .card { display: flex; flex-direction: column; gap: 10px; }
        input {
          width: 100%; border: 1px solid var(--jv-line); border-radius: 12px;
          padding: 14px; font-size: 16px; font-family: inherit; outline: none;
        }
        input:focus { border-color: var(--jv-blue); }
        button {
          width: 100%; border: 0; border-radius: 12px; padding: 15px;
          background: var(--jv-blue); color: #fff; font-size: 16px; font-weight: 700;
          font-family: inherit; cursor: pointer; margin-top: 4px;
        }
        button:disabled { opacity: 0.55; cursor: default; }
        .err { font-size: 14px; color: var(--jv-red); margin: 2px 0 0; line-height: 1.5; }
        .hint { font-size: 14px; color: var(--jv-muted); margin: 0 0 4px; line-height: 1.5; }
        .ghost {
          background: none; color: var(--jv-muted); font-weight: 500; font-size: 14px;
          padding: 8px; margin-top: 0;
        }
      `}</style>
    </div>
  );
}
