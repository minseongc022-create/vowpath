"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGiuAuth } from "./GiuAuthProvider";

export function CustomerLoginForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role: "customer" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다");
        return;
      }
      await refresh();
      router.push("/giu/hop");
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">로그인</h2>
      <div>
        <label className="giu-label">이메일</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">비밀번호</label>
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="giu-input"
        />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "로그인 중..." : "로그인"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        계정이 없으신가요?{" "}
        <Link href="/giu/dang-ky" className="font-semibold text-giu-primary">
          회원가입
        </Link>
      </p>
    </form>
  );
}

export function CustomerRegisterForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다");
        return;
      }
      await refresh();
      router.push("/giu/hop");
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">계정 만들기</h2>
      <p className="text-sm text-giu-muted">안전 결제 · 결제 후 바로 구출 코드를 받습니다.</p>
      <div>
        <label className="giu-label">이름</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">이메일</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">전화번호</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">비밀번호 (최소 6자)</label>
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="giu-input"
        />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "가입 중..." : "회원가입"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/giu/dang-nhap" className="font-semibold text-giu-primary">
          로그인
        </Link>
      </p>
    </form>
  );
}
