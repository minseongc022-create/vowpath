"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants";
import { clearTenantLocalCache } from "@/lib/dashboard-data-client";

/** Reject open redirects like `//evil.com` while allowing internal paths. */
function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

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
  rememberMeLabel: string;
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
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("effiroad_remember_login");
      if (saved === "0") setRememberMe(false);
    } catch {
      /* ignore */
    }
  }, []);

  const copy: FormCopy = formCopy ?? {
    passwordConfirmLabel: "Confirm password",
    passwordMismatch: "Passwords do not match.",
    loading: "Working…",
    errorGeneric: "Request failed.",
    errorNetwork: "Network error. Please try again shortly.",
    backHome: "← Back to home",
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body: Record<string, string | boolean> = {};

    if (mode === "login" && enablePhoneLogin) {
      if (loginMethod === "phone") {
        body.phone = phone.trim();
      } else {
        body.email = email.trim();
      }
      body.password = String(form.get("password") ?? "");
      body.rememberMe = rememberMe;
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
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error ?? copy.errorGeneric);
        setLoading(false);
        return;
      }

      if (mode === "login" && data.ok !== true) {
        setError(copy.errorGeneric);
        setLoading(false);
        return;
      }

      if (mode === "login") {
        clearTenantLocalCache();
      }

      const next = safeNextPath(searchParams.get("next"));
      router.push(next ?? data.redirect ?? defaultRedirect);
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
      <div className="hvac-card-elevated border-t-4 border-t-brand-500 p-8 text-slate-900">
        <h1 className="text-2xl font-bold text-brand-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {usePhoneLogin ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-800">
                  {loginCopy.methodLegend}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 text-sm font-medium text-slate-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900">
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
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-border px-3 py-2.5 text-sm font-medium text-slate-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900">
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
                  className="block text-sm font-medium text-slate-800"
                >
                  {loginMethod === "phone" ? loginCopy.phoneLabel : fields[0]?.label ?? "Email"}
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
                    className="block text-sm font-medium text-slate-800"
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
                  className="block text-sm font-medium text-slate-800"
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

          {mode === "login" && loginCopy ? (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  const next = e.target.checked;
                  setRememberMe(next);
                  try {
                    localStorage.setItem("effiroad_remember_login", next ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                }}
                className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
              />
              {loginCopy.rememberMeLabel}
            </label>
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
