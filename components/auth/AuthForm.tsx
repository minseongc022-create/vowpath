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

type LoginCopy = {
  methodLegend: string;
  methodEmail: string;
  methodPhone: string;
  phoneLabel: string;
  phonePlaceholder: string;
};

type FormCopy = {
  passwordConfirmLabel: string;
  passwordMismatch: string;
  loading: string;
  errorGeneric: string;
  errorNetwork: string;
  backHome: string;
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
  enablePhoneLogin?: boolean;
  loginCopy?: LoginCopy;
  formCopy?: FormCopy;
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
  enablePhoneLogin = false,
  loginCopy,
  formCopy,
}: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email")?.trim() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");

  const copy: FormCopy = formCopy ?? {
    passwordConfirmLabel: "비밀번호 확인",
    passwordMismatch: "비밀번호 확인이 일치하지 않습니다.",
    loading: "처리 중…",
    errorGeneric: "요청에 실패했습니다.",
    errorNetwork: "네트워크 오류. 잠시 후 다시 시도해 주세요.",
    backHome: "← 홈으로",
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};

    if (mode === "login" && enablePhoneLogin) {
      if (loginMethod === "phone") {
        body.phone = phone.trim();
      } else {
        body.email = email.trim();
      }
      body.password = String(form.get("password") ?? "");
    } else {
      fields.forEach((f) => {
        body[f.name] = String(form.get(f.name) ?? "");
      });
    }

    if (mode === "signup") {
      const password = body.password ?? "";
      const confirm = String(form.get("passwordConfirm") ?? "");
      if (password !== confirm) {
        setError(copy.passwordMismatch);
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
        setError(data.error ?? copy.errorGeneric);
        setLoading(false);
        return;
      }

      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : data.redirect ?? defaultRedirect);
      router.refresh();
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  const passwordField = fields.find((f) => f.name === "password");
  const usePhoneLogin = mode === "login" && enablePhoneLogin && loginCopy;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="hvac-card-elevated border-t-4 border-t-brand-500 p-8">
        <h1 className="text-2xl font-bold text-brand-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {usePhoneLogin ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-brand-900">
                  {loginCopy.methodLegend}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input
                      type="radio"
                      name="loginMethod"
                      value="email"
                      checked={loginMethod === "email"}
                      onChange={() => setLoginMethod("email")}
                      className="sr-only"
                    />
                    {loginCopy.methodEmail}
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input
                      type="radio"
                      name="loginMethod"
                      value="phone"
                      checked={loginMethod === "phone"}
                      onChange={() => setLoginMethod("phone")}
                      className="sr-only"
                    />
                    {loginCopy.methodPhone}
                  </label>
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-brand-900"
                >
                  {loginMethod === "phone" ? loginCopy.phoneLabel : fields[0].label}
                </label>
                <input
                  id="login-identifier"
                  type={loginMethod === "phone" ? "tel" : "email"}
                  required
                  autoComplete={loginMethod === "phone" ? "tel" : "email"}
                  placeholder={
                    loginMethod === "phone" ? loginCopy.phonePlaceholder : undefined
                  }
                  value={loginMethod === "phone" ? phone : email}
                  onChange={(e) =>
                    loginMethod === "phone" ? setPhone(e.target.value) : setEmail(e.target.value)
                  }
                  className="hvac-input mt-1.5"
                />
              </div>

              {passwordField ? (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-brand-900"
                  >
                    {passwordField.label}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete={passwordField.autoComplete}
                    className="hvac-input mt-1.5"
                  />
                </div>
              ) : null}
            </>
          ) : (
            fields.map((field) => (
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
                  required={field.name !== "shopName" && field.name !== "phone"}
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
            ))
          )}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-brand-900"
              >
                {copy.passwordConfirmLabel}
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
            {loading ? copy.loading : submitLabel}
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
          {copy.backHome}
        </Link>
      </p>
    </div>
  );
}
