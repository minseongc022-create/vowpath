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

  const initialRole = (searchParams.get("role") === "merchant" ? "merchant" : "customer") as GiuAppRole;
  const initialMode = (searchParams.get("mode") === "signup" ? "signup" : "login") as AuthMode;

  const [role, setRole] = useState<GiuAppRole>(initialRole);
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
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mt-1 text-sm text-giu-muted">구매와 판매는 별도 앱으로 분리됩니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-giu-bg p-1">
        {(
          [
            { id: "customer" as const, label: "구매", sub: "손님" },
            { id: "merchant" as const, label: "판매", sub: "가게" },
          ] as const
        ).map((item) => {
          const selected = role === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              className={`rounded-xl px-3 py-3 text-left transition ${
                selected ? "bg-giu-surface shadow-giu-sm ring-2 ring-giu-primary" : "text-giu-muted"
              }`}
            >
              <span className="block text-sm font-bold text-giu-ink">{item.label}</span>
              <span className="block text-xs">{item.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "font-bold text-giu-primary" : "text-giu-muted"}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "font-bold text-giu-primary" : "text-giu-muted"}
        >
          회원가입
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
          <button type="button" onClick={() => setMode("signup")} className="font-semibold text-giu-primary">
            회원가입
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-giu-muted">
          이미 계정이 있으신가요?{" "}
          <button type="button" onClick={() => setMode("login")} className="font-semibold text-giu-primary">
            로그인
          </button>
        </p>
      )}

      <p className="text-center text-sm text-giu-muted">
        <Link href={GIU_ROUTES.customer.home} className="text-giu-primary">
          로그인 없이 박스 둘러보기 →
        </Link>
      </p>
    </div>
  );
}
