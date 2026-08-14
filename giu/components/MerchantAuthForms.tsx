"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { GIu_DISTRICTS } from "@/giu/lib/districts";
import { useGiuAuth } from "./GiuAuthProvider";

export function MerchantLoginForm() {
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
        body: JSON.stringify({ email, password, role: "merchant" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다");
        return;
      }
      await refresh();
      router.push("/giu/cua-hang/panel");
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">가게 로그인</h2>
      <div>
        <label className="giu-label">이메일</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">비밀번호</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="giu-input" />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "로그인 중..." : "패널로 이동"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        가게가 없으신가요?{" "}
        <Link href="/giu/cua-hang" className="font-semibold text-giu-primary">
          가게 등록
        </Link>
      </p>
    </form>
  );
}

export function MerchantSignupForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/auth/register/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          category: fd.get("category"),
          district: fd.get("district"),
          address: fd.get("address"),
          phone: fd.get("phone"),
          zalo: fd.get("zalo") || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다");
        return;
      }
      await refresh();
      router.push("/giu/cua-hang/panel");
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">가게 등록</h2>
      <div>
        <label className="giu-label">가게 이름 *</label>
        <input name="name" required className="giu-input" />
      </div>
      <div>
        <label className="giu-label">로그인 이메일 *</label>
        <input name="email" required type="email" className="giu-input" />
      </div>
      <div>
        <label className="giu-label">비밀번호 * (최소 6자)</label>
        <input name="password" required type="password" minLength={6} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">업종 *</label>
        <select name="category" required className="giu-input">
          {GIu_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="giu-label">구(군) *</label>
        <select name="district" required className="giu-input">
          {GIu_DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="giu-label">가게 주소 *</label>
        <input name="address" required className="giu-input" placeholder="번지, 거리, 구" />
      </div>
      <div>
        <label className="giu-label">전화번호 *</label>
        <input name="phone" required type="tel" className="giu-input" placeholder="0901234567" />
      </div>
      <div>
        <label className="giu-label">Zalo (선택)</label>
        <input name="zalo" type="tel" className="giu-input" />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "등록 중..." : "가게 등록 & 패널 이동"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        이미 가게가 있으신가요?{" "}
        <Link href="/giu/cua-hang/dang-nhap" className="font-semibold text-giu-primary">
          로그인
        </Link>
      </p>
    </form>
  );
}
