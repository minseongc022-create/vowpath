"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/lib/constants";

type Field = {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
};

type AuthFormProps = {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  fields: Field[];
  submitLabel: string;
  footerText: string;
  footerLinkHref: string;
  footerLinkLabel: string;
  forgotPasswordHref?: string;
  forgotPasswordLabel?: string;
  apiPath: "/api/auth/login" | "/api/auth/signup";
  defaultRedirect: string;
};

export function AuthForm({
  mode,
  title,
  subtitle,
  fields,
  submitLabel,
  footerText,
  footerLinkHref,
  footerLinkLabel,
  forgotPasswordHref,
  forgotPasswordLabel,
  apiPath,
  defaultRedirect,
}: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email")?.trim() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fields.forEach((f) => {
      body[f.name] = String(form.get(f.name) ?? "");
    });

    if (mode === "signup") {
      const password = body.password ?? "";
      const confirm = String(form.get("passwordConfirm") ?? "");
      if (password !== confirm) {
        setError("비밀번호 확인이 일치하지 않습니다.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        setLoading(false);
        return;
      }

      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : data.redirect ?? defaultRedirect);
      router.refresh();
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="hvac-card border-t-4 border-t-brand-500 p-8">
        <h1 className="text-2xl font-bold text-brand-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {fields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-brand-900"
              >
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.name !== "shopName"}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                defaultValue={
                  mode === "login" && field.name === "email" ? defaultEmail : undefined
                }
                className="hvac-input mt-1.5"
              />
              {field.hint ? (
                <p className="mt-1 text-xs text-slate-500">{field.hint}</p>
              ) : null}
            </div>
          ))}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-brand-900"
              >
                비밀번호 확인
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                autoComplete="new-password"
                className="hvac-input mt-1.5"
              />
            </div>
          )}

          {mode === "login" && forgotPasswordHref ? (
            <p className="text-right">
              <Link
                href={forgotPasswordHref}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {forgotPasswordLabel}
              </Link>
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
          >
            {loading ? "처리 중…" : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {footerText}{" "}
          <Link href={footerLinkHref} className="font-semibold text-brand-600 hover:underline">
            {footerLinkLabel}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center">
        <Link href={ROUTES.home} className="text-sm text-slate-500 hover:text-slate-800">
          ← 홈으로
        </Link>
      </p>
    </div>
  );
}
