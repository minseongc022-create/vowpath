"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authPages } from "@/lib/content";
import { ROUTES } from "@/lib/constants";

type Step = "details" | "verify";

export function SignupForm() {
  const router = useRouter();
  const p = authPages.signup;
  const form = authPages.form;

  const [step, setStep] = useState<Step>("details");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [signupRequestId, setSignupRequestId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSms = channel === "sms";

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password !== passwordConfirm) {
      setError(form.passwordMismatch);
      setLoading(false);
      return;
    }

    if (isSms && !phone.trim()) {
      setError(p.phoneRequiredSms);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          email,
          phone: phone.trim(),
          password,
          passwordConfirm,
          channel,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? form.errorGeneric);
        setLoading(false);
        return;
      }

      setSignupRequestId(data.signupRequestId);
      setMessage(
        data.devHint
          ? `${data.message ?? p.sentCodeMessage}\n\n${data.devHint}`
          : (data.message ?? p.sentCodeMessage),
      );
      setStep("verify");
    } catch {
      setError(form.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupRequestId, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? form.errorGeneric);
        setLoading(false);
        return;
      }

      router.push(data.redirect ?? "/settings");
      router.refresh();
    } catch {
      setError(form.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="hvac-card border-t-4 border-t-brand-500 p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <span className={step === "details" ? "text-brand-700" : ""}>{p.step1Label}</span>
          <span className="text-slate-300">→</span>
          <span className={step === "verify" ? "text-brand-700" : "text-slate-400"}>
            {p.step2Label}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-brand-950">{p.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {step === "details" ? p.subtitle : p.subtitleVerify}
        </p>

        {step === "details" ? (
          <form onSubmit={handleSendCode} className="mt-8 space-y-5">
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-brand-900">
                {p.shopLabel}
              </label>
              <input
                id="shopName"
                type="text"
                autoComplete="organization"
                placeholder={p.shopPlaceholder}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="hvac-input mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-900">
                {p.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="hvac-input mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-900">
                {p.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hvac-input mt-1.5"
              />
              <p className="mt-1 text-xs text-slate-500">{p.passwordHint}</p>
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-brand-900"
              >
                {form.passwordConfirmLabel}
              </label>
              <input
                id="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="hvac-input mt-1.5"
              />
            </div>

            <fieldset className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <legend className="px-1 text-sm font-semibold text-brand-900">
                {p.verifyChannelLabel}
              </legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:ring-2 has-[:checked]:ring-brand-200">
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                />
                {p.verifyChannelEmail}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:ring-2 has-[:checked]:ring-brand-200">
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                />
                {p.verifyChannelSms}
              </label>
              <p className="text-xs text-slate-600">{p.verifyChannelHint}</p>
            </fieldset>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brand-900">
                {isSms ? p.phoneLabelRequired : p.phoneLabel}
              </label>
              <input
                id="phone"
                type="tel"
                required={isSms}
                autoComplete="tel"
                placeholder={p.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="hvac-input mt-1.5"
              />
              <p className="mt-1 text-xs text-slate-500">
                {isSms ? p.phoneHintSms : p.phoneHintOptional}
              </p>
            </div>

            {error ? <ErrorBox message={error} /> : null}

            <button
              type="submit"
              disabled={loading}
              className="hvac-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? form.loading : p.sendCode}
            </button>
            <p className="text-center text-xs text-slate-500">{p.sendCodeNote}</p>
          </form>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="mt-8 space-y-5">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-brand-900">
                {p.codeLabel}
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
              <p className="mt-1 text-xs text-slate-500">{p.codeHint}</p>
            </div>

            {error ? <ErrorBox message={error} /> : null}
            {message ? <InfoBox message={message} /> : null}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="hvac-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? form.loading : p.completeSignup}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("details");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              {p.backToDetails}
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          {p.hasAccount}{" "}
          <Link href={ROUTES.login} className="font-semibold text-brand-600 hover:underline">
            {p.loginLink}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center">
        <Link href={ROUTES.home} className="text-sm text-slate-500 hover:text-slate-800">
          {form.backHome}
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
