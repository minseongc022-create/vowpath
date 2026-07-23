"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authPages } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { evaluatePasswordPolicy } from "@/lib/password-policy";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

type Step = "request" | "verify" | "reset" | "done";

export function ForgotPasswordForm() {
  const router = useRouter();
  const copy = authPages.forgotPassword;

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const isSms = channel === "sms";
  const [requestId, setRequestId] = useState("");
  const [hasPhone, setHasPhone] = useState(false);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSms ? { phone: phone.trim(), channel: "sms" } : { email, channel: "email" },
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? copy.errorGeneric);
        setLoading(false);
        return;
      }

      const channelMessage = isSms ? copy.sentMessageSms : copy.sentMessageEmail;
      setMessage(data.devHint ? `${channelMessage}\n\n${data.devHint}` : channelMessage);
      if (data.requestId) {
        setRequestId(data.requestId);
        setHasPhone(Boolean(data.hasPhone));
        if (data.email) setEmail(data.email);
        setStep("verify");
      }
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? copy.errorGeneric);
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setStep("reset");
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== passwordConfirm) {
      setError(authPages.form.passwordMismatch);
      setLoading(false);
      return;
    }

    const policy = evaluatePasswordPolicy(password);
    if (!policy.ok) {
      setError(policy.error ?? copy.errorGeneric);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password, passwordConfirm }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? copy.errorGeneric);
        setLoading(false);
        return;
      }

      if (data.email) setEmail(data.email);
      setMessage(data.message ?? copy.doneMessage);
      setStep("done");
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="hvac-card-elevated border-t-4 border-t-brand-500 p-8">
        <h1 className="text-2xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {step === "request"
            ? isSms
              ? copy.subtitleRequestSms
              : copy.subtitleRequest
            : step === "verify"
              ? copy.subtitleVerify
              : step === "reset"
                ? copy.subtitleReset
                : copy.subtitleDone}
        </p>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="mt-8 space-y-5">
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-slate-700">
                {isSms ? copy.phoneLabel : copy.emailLabel}
              </label>
              <input
                id="contact"
                type={isSms ? "tel" : "email"}
                required
                autoComplete={isSms ? "tel" : "email"}
                placeholder={isSms ? copy.phonePlaceholder : undefined}
                value={isSms ? phone : email}
                onChange={(e) => (isSms ? setPhone : setEmail)(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">{copy.channelLabel}</legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2.5 text-sm">
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                />
                {copy.channelEmail}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2.5 text-sm">
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                />
                {copy.channelSms}
              </label>
              <p className="text-xs text-slate-500">{copy.channelHint}</p>
              <p className="text-xs text-amber-800">{copy.devEmailHint}</p>
            </fieldset>

            {error ? <ErrorBox message={error} /> : null}
            {message ? <InfoBox message={message} /> : null}

            <button
              type="submit"
              disabled={loading}
              className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
            >
              {loading ? copy.loading : copy.sendCode}
            </button>
          </form>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="mt-8 space-y-5">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700">
                {copy.codeLabel}
              </label>
              <input
                id="code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-center font-mono text-lg tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">{copy.codeHint}</p>
            </div>

            {hasPhone && channel === "email" ? (
              <button
                type="button"
                className="text-sm font-medium text-brand-600 hover:underline"
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  const res = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, channel: "sms" }),
                  });
                  const data = await res.json();
                  setLoading(false);
                  if (res.ok && data.requestId) {
                    setRequestId(data.requestId);
                    setChannel("sms");
                    setMessage(copy.resendSmsSuccess);
                  } else {
                    setError(data.error ?? copy.errorGeneric);
                  }
                }}
              >
                {copy.resendSms}
              </button>
            ) : null}

            {error ? <ErrorBox message={error} /> : null}
            {message ? <InfoBox message={message} /> : null}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
            >
              {loading ? copy.loading : copy.verifyCode}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("request");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              {copy.backToEmail}
            </button>
          </form>
        ) : null}

        {step === "reset" ? (
          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                {copy.newPasswordLabel}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
              <PasswordStrengthIndicator
                password={password}
                hint={authPages.signup.passwordHint}
              />
            </div>
            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-slate-700"
              >
                {copy.confirmPasswordLabel}
              </label>
              <input
                id="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}

            <button
              type="submit"
              disabled={loading}
              className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
            >
              {loading ? copy.loading : copy.resetPassword}
            </button>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="mt-8 space-y-4">
            {message ? <InfoBox message={message} /> : null}
            <button
              type="button"
              onClick={() =>
                router.push(
                  `${ROUTES.login}?email=${encodeURIComponent(email)}`,
                )
              }
              className="hvac-btn-primary w-full px-4 py-3 text-sm"
            >
              {copy.goLogin}
            </button>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href={ROUTES.login} className="font-semibold text-brand-600 hover:underline">
            {copy.backLogin}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center">
        <Link href={ROUTES.home} className="text-sm text-slate-500 hover:text-slate-800">
          {authPages.form.backHome}
        </Link>
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <p className="whitespace-pre-line rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      {message}
    </p>
  );
}
