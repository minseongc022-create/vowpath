"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { GIu_DISTRICTS } from "@/giu/lib/districts";
import { GIU_ROUTES, homePathForRole, type GiuAppRole } from "@/giu/lib/routes";
import { useGiuAuth } from "./GiuAuthProvider";

type AuthMode = "login" | "signup";

function safeNextPath(raw: string | null, role: GiuAppRole): string {
  if (!raw || !raw.startsWith("/giu")) return homePathForRole(role);
  if (role === "merchant" && !raw.startsWith("/giu/cua-hang")) {
    return GIU_ROUTES.merchant.home;
  }
  if (role === "customer" && raw.startsWith("/giu/cua-hang")) {
    return GIU_ROUTES.customer.home;
  }
  return raw;
}

export function GiuAuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useGiuAuth();

  // Role is fixed by entry URL — no customer/merchant toggle on one screen.
  const role = (searchParams.get("role") === "merchant" ? "merchant" : "customer") as GiuAppRole;
  const initialMode = (searchParams.get("mode") === "signup" ? "signup" : "login") as AuthMode;

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next"), role),
    [role, searchParams],
  );

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
          role,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다");
        return;
      }
      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          password: fd.get("password"),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다");
        return;
      }
      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMerchantSignup(e: React.FormEvent<HTMLFormElement>) {
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
        setError(data.error ?? "회원가입에 실패했습니다");
        return;
      }
      await refresh();
      router.push(GIU_ROUTES.merchant.home);
      router.refresh();
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="giu-page space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-giu-ink">
          {role === "merchant"
            ? mode === "login"
              ? "가게 로그인"
              : "가게 등록"
            : mode === "login"
              ? "손님 로그인"
              : "손님 가입"}
        </h1>
        <p className="mt-1 text-sm text-giu-muted">
          {role === "merchant" ? "박스 등록 · 주문 · 정산" : "박스 찾기 · 결제 · 픽업 코드"}
        </p>
      </div>

      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "font-bold text-giu-accent" : "text-giu-muted"}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "font-bold text-giu-accent" : "text-giu-muted"}
        >
          {role === "merchant" ? "가게 등록" : "회원가입"}
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="giu-card space-y-4">
          <div>
            <label className="giu-label">이메일</label>
            <input name="email" required type="email" className="giu-input" />
          </div>
          <div>
            <label className="giu-label">비밀번호</label>
            <input name="password" required type="password" minLength={6} className="giu-input" />
          </div>
          {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
          <button type="submit" disabled={loading} className="giu-btn-primary">
            {loading ? "로그인 중..." : role === "merchant" ? "가게 로그인" : "손님 로그인"}
          </button>
        </form>
      ) : role === "customer" ? (
        <form onSubmit={handleCustomerSignup} className="giu-card space-y-4">
          <div>
            <label className="giu-label">이름</label>
            <input name="name" required className="giu-input" />
          </div>
          <div>
            <label className="giu-label">이메일</label>
            <input name="email" required type="email" className="giu-input" />
          </div>
          <div>
            <label className="giu-label">전화번호</label>
            <input name="phone" required type="tel" className="giu-input" />
          </div>
          <div>
            <label className="giu-label">비밀번호 (최소 6자)</label>
            <input name="password" required type="password" minLength={6} className="giu-input" />
          </div>
          {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
          <button type="submit" disabled={loading} className="giu-btn-primary">
            {loading ? "가입 중..." : "손님으로 시작"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMerchantSignup} className="giu-card space-y-4">
          <div>
            <label className="giu-label">가게 이름</label>
            <input name="name" required className="giu-input" />
          </div>
          <div>
            <label className="giu-label">로그인 이메일</label>
            <input name="email" required type="email" className="giu-input" />
          </div>
          <div>
            <label className="giu-label">비밀번호 (최소 6자)</label>
            <input name="password" required type="password" minLength={6} className="giu-input" />
          </div>
          <div>
            <label className="giu-label">업종</label>
            <select name="category" required className="giu-input" defaultValue="banh_mi">
              {GIu_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="giu-label">구(군)</label>
            <select name="district" required className="giu-input" defaultValue="quan_1">
              {GIu_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="giu-label">가게 주소</label>
            <input name="address" required className="giu-input" placeholder="번지, 거리, 구" />
          </div>
          <div>
            <label className="giu-label">전화번호</label>
            <input name="phone" required type="tel" className="giu-input" placeholder="0901234567" />
          </div>
          <div>
            <label className="giu-label">Zalo (선택)</label>
            <input name="zalo" type="tel" className="giu-input" />
          </div>
          {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
          <button type="submit" disabled={loading} className="giu-btn-primary">
            {loading ? "가입 중..." : "가게로 시작"}
          </button>
        </form>
      )}

      {mode === "login" ? (
        <p className="text-center text-sm text-giu-muted">
          계정이 없으신가요?{" "}
          <button type="button" onClick={() => setMode("signup")} className="font-semibold text-giu-accent">
            {role === "merchant" ? "가게 등록" : "회원가입"}
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-giu-muted">
          이미 계정이 있으신가요?{" "}
          <button type="button" onClick={() => setMode("login")} className="font-semibold text-giu-accent">
            로그인
          </button>
        </p>
      )}

      {role === "customer" ? (
        <p className="text-center text-[12px] text-giu-muted">
          가게 사장님이신가요?{" "}
          <Link href={`${GIU_ROUTES.auth}?role=merchant`} className="font-semibold text-giu-ink">
            가게 로그인
          </Link>
        </p>
      ) : (
        <p className="text-center text-[12px] text-giu-muted">
          손님이신가요?{" "}
          <Link href={`${GIU_ROUTES.auth}?role=customer`} className="font-semibold text-giu-ink">
            손님 로그인
          </Link>
        </p>
      )}
    </div>
  );
}
