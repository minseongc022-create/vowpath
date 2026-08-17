"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { merchantCategories } from "@/giu/lib/categories";
import { merchantDistricts } from "@/giu/lib/districts";
import {
  authEmailError,
  authPasswordConfirmError,
  authPasswordError,
  authPasswordRules,
  normalizeAuthEmail,
} from "@/giu/lib/auth-validation";
import {
  GIU_ROUTES,
  homePathForRole,
  toGiuInternalPath,
  type GiuAppRole,
} from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuHref } from "./GiuNavProvider";
import { useGiuLocale } from "./GiuLocaleProvider";

type AuthMode = "login" | "signup";

function safeNextPath(raw: string | null, role: GiuAppRole): string {
  if (!raw) return homePathForRole(role);
  const internal = toGiuInternalPath(raw);
  if (!internal.startsWith("/giu")) return homePathForRole(role);
  if (role === "merchant" && !internal.startsWith("/giu/cua-hang")) {
    return GIU_ROUTES.merchant.home;
  }
  if (role === "customer" && internal.startsWith("/giu/cua-hang")) {
    return GIU_ROUTES.customer.home;
  }
  return internal;
}

function PasswordStrengthHint({ password, locale }: { password: string; locale: GiuLocale }) {
  const rules = authPasswordRules(password);
  if (!password) {
    return <p className="text-[11px] font-semibold text-giu-muted">{t(locale, "authPasswordHint")}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
            rule.ok ? "bg-giu-primary/10 text-giu-primary" : "bg-giu-bg text-giu-muted ring-1 ring-giu-border"
          }`}
        >
          {rule.ok ? "✓ " : ""}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

function SignupPasswordFields({
  locale,
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
}: {
  locale: GiuLocale;
  password: string;
  confirm: string;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="giu-label">비밀번호</label>
        <input
          name="password"
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="giu-input"
        />
        <div className="mt-1.5">
          <PasswordStrengthHint password={password} locale={locale} />
        </div>
      </div>
      <div>
        <label className="giu-label">{t(locale, "authPasswordConfirm")}</label>
        <input
          name="passwordConfirm"
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          className="giu-input"
        />
      </div>
    </>
  );
}

export function GiuAuthScreen() {
  const searchParams = useSearchParams();
  const href = useGiuHref();
  const { locale } = useGiuLocale();
  const { refresh, applySession } = useGiuAuth();

  const role = (searchParams.get("role") === "merchant" ? "merchant" : "customer") as GiuAppRole;
  const initialMode = (searchParams.get("mode") === "signup" ? "signup" : "login") as AuthMode;

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerPasswordConfirm, setCustomerPasswordConfirm] = useState("");
  const [merchantPassword, setMerchantPassword] = useState("");
  const [merchantPasswordConfirm, setMerchantPasswordConfirm] = useState("");

  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next"), role),
    [role, searchParams],
  );

  function go(internalPath: string) {
    window.location.assign(href(internalPath));
  }

  function validateSignupCredentials(email: string, password: string, confirm: string): string | null {
    const emailErr = authEmailError(email);
    if (emailErr) return emailErr;
    const passwordErr = authPasswordError(password);
    if (passwordErr) return passwordErr;
    const confirmErr = authPasswordConfirmError(password, confirm);
    if (confirmErr) return confirmErr;
    return null;
  }

  function validateLoginEmail(email: string): string | null {
    return authEmailError(email);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const emailErr = validateLoginEmail(email);
    if (emailErr) {
      setError(emailErr);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/giu/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizeAuthEmail(email),
          password: fd.get("password"),
          role,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        account?: {
          id: string;
          email: string;
          name: string;
          phone: string;
          role: "customer" | "merchant";
          market: "vn" | "kr";
        };
        merchant?: import("@/giu/lib/types").GiuMerchant | null;
      };
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다");
        return;
      }
      if (data.account) {
        applySession({ account: data.account, merchant: data.merchant ?? null });
      } else {
        await refresh();
      }
      go(nextPath);
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
    const email = String(fd.get("email") ?? "");
    const credErr = validateSignupCredentials(email, customerPassword, customerPasswordConfirm);
    if (credErr) {
      setError(credErr);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/giu/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: fd.get("name"),
          email: normalizeAuthEmail(email),
          phone: fd.get("phone"),
          password: customerPassword,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        account?: {
          id: string;
          email: string;
          name: string;
          phone: string;
          role: "customer" | "merchant";
          market: "vn" | "kr";
        };
      };
      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다");
        return;
      }
      if (data.account) {
        applySession({ account: data.account, merchant: null });
      } else {
        await refresh();
      }
      go(nextPath);
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
    const email = String(fd.get("email") ?? "");
    const ownerName = String(fd.get("ownerName") ?? "").trim();
    const storeName = String(fd.get("storeName") ?? "").trim();
    if (ownerName.length < 2) {
      setError("이름은 2자 이상 입력해 주세요");
      setLoading(false);
      return;
    }
    if (storeName.length < 2) {
      setError("가게 이름은 2자 이상 입력해 주세요");
      setLoading(false);
      return;
    }
    const credErr = validateSignupCredentials(email, merchantPassword, merchantPasswordConfirm);
    if (credErr) {
      setError(credErr);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/giu/auth/register/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ownerName,
          storeName,
          email: normalizeAuthEmail(email),
          password: merchantPassword,
          category: fd.get("category"),
          district: fd.get("district"),
          address: fd.get("address"),
          phone: fd.get("phone"),
          market: "kr",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        account?: {
          id: string;
          email: string;
          name: string;
          phone: string;
          role: "customer" | "merchant";
          market: "vn" | "kr";
        };
        merchant?: import("@/giu/lib/types").GiuMerchant | null;
      };
      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다");
        return;
      }
      if (data.account) {
        applySession({ account: data.account, merchant: data.merchant ?? null });
      } else {
        await refresh();
      }
      go(GIU_ROUTES.merchant.home);
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const krCategories = merchantCategories();
  const krDistricts = merchantDistricts();

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
  }

  return (
    <div className="giu-page space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-giu-ink">
          {role === "merchant"
            ? mode === "login"
              ? "가게 로그인"
              : "인천 가게 입점"
            : mode === "login"
              ? "손님 로그인"
              : "손님 가입"}
        </h1>
        <p className="mt-1 text-sm font-semibold text-giu-muted">
          {role === "merchant"
            ? "마감할인 등록 · 주문 · 정산 · 입점비 0원"
            : "박스 찾기 · 결제 · 픽업 코드"}
        </p>
        <p className="mt-2 text-[11px] leading-snug text-giu-muted">{t(locale, "authDualRoleHint")}</p>
      </div>

      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={mode === "login" ? "font-bold text-giu-primary" : "text-giu-muted"}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={mode === "signup" ? "font-bold text-giu-primary" : "text-giu-muted"}
        >
          {role === "merchant" ? "가게 등록" : "회원가입"}
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="giu-card space-y-4">
          <div>
            <label className="giu-label">이메일</label>
            <input
              name="email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              className="giu-input giu-input-hint"
              placeholder={t(locale, "authEmailPh")}
            />
          </div>
          <div>
            <label className="giu-label">비밀번호</label>
            <input
              name="password"
              required
              type="password"
              autoComplete="current-password"
              className="giu-input"
            />
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
            <input name="name" required minLength={2} className="giu-input" />
          </div>
          <div>
            <label className="giu-label">이메일</label>
            <input
              name="email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              className="giu-input giu-input-hint"
              placeholder={t(locale, "authEmailPh")}
            />
          </div>
          <div>
            <label className="giu-label">전화번호</label>
            <input name="phone" required type="tel" className="giu-input giu-input-hint" placeholder="01012345678" />
          </div>
          <SignupPasswordFields
            locale={locale}
            password={customerPassword}
            confirm={customerPasswordConfirm}
            onPasswordChange={setCustomerPassword}
            onConfirmChange={setCustomerPasswordConfirm}
          />
          {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
          <button type="submit" disabled={loading} className="giu-btn-primary">
            {loading ? "가입 중..." : "손님으로 시작"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMerchantSignup} className="giu-card space-y-4">
          <div>
            <label className="giu-label">{t(locale, "authOwnerName")}</label>
            <input
              name="ownerName"
              required
              minLength={2}
              maxLength={40}
              className="giu-input giu-input-hint"
              placeholder={t(locale, "authOwnerNamePh")}
            />
          </div>
          <div>
            <label className="giu-label">{t(locale, "authStoreName")}</label>
            <input
              name="storeName"
              required
              minLength={2}
              maxLength={120}
              className="giu-input giu-input-hint"
              placeholder={t(locale, "authStoreNamePh")}
            />
          </div>
          <div>
            <label className="giu-label">로그인 이메일</label>
            <input
              name="email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              className="giu-input giu-input-hint"
              placeholder={t(locale, "authEmailPh")}
            />
          </div>
          <SignupPasswordFields
            locale={locale}
            password={merchantPassword}
            confirm={merchantPasswordConfirm}
            onPasswordChange={setMerchantPassword}
            onConfirmChange={setMerchantPasswordConfirm}
          />
          <div>
            <label className="giu-label">업종</label>
            <select name="category" required className="giu-input" defaultValue="bakery">
              {krCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="giu-label">인천 구</label>
            <select name="district" required className="giu-input" defaultValue="icn_yeonsu">
              {krDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="giu-label">가게 주소</label>
            <input
              name="address"
              required
              minLength={5}
              className="giu-input giu-input-hint"
              placeholder="예: 인천 연수구 컨벤시아대로 123"
            />
          </div>
          <div>
            <label className="giu-label">전화번호</label>
            <input
              name="phone"
              required
              type="tel"
              className="giu-input giu-input-hint"
              placeholder="01012345678"
            />
          </div>
          {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
          <button type="submit" disabled={loading} className="giu-btn-primary">
            {loading ? "가입 중..." : "무료 입점 & 시작"}
          </button>
        </form>
      )}

      {mode === "login" ? (
        <p className="text-center text-sm text-giu-muted">
          계정이 없으신가요?{" "}
          <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-giu-primary">
            {role === "merchant" ? "가게 등록" : "회원가입"}
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-giu-muted">
          이미 계정이 있으신가요?{" "}
          <button type="button" onClick={() => switchMode("login")} className="font-semibold text-giu-primary">
            로그인
          </button>
        </p>
      )}

      {role === "customer" ? (
        <p className="text-center text-[12px] text-giu-muted">
          가게 사장님이신가요?{" "}
          <Link href={`${href(GIU_ROUTES.auth)}?role=merchant`} className="font-semibold text-giu-ink">
            가게 로그인
          </Link>
        </p>
      ) : (
        <p className="text-center text-[12px] text-giu-muted">
          손님이신가요?{" "}
          <Link href={`${href(GIU_ROUTES.auth)}?role=customer`} className="font-semibold text-giu-ink">
            손님 로그인
          </Link>
        </p>
      )}
    </div>
  );
}
