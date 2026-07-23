"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authPages } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import {
  ownerSignupPhoneHint,
  ownerSignupPhonePlaceholder,
} from "@/lib/owner-phone-policy";
import { normalizeShopVertical, type ShopVertical } from "@/lib/shop-vertical";
import {
  serviceLimitationsConsentBody,
  serviceLimitationsConsentCheckboxLabel,
  serviceLimitationsConsentTitle,
} from "@/lib/service-limitations-consent";

type Step = "details" | "verify";

const RESEND_COOLDOWN_SEC = 60;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const p = authPages.signup;
  const form = authPages.form;

  const verticalParam = searchParams.get("vertical");
  const planParam = searchParams.get("plan")?.trim() || "";
  const vertical: ShopVertical = normalizeShopVertical(
    verticalParam ?? undefined,
  );

  const [step, setStep] = useState<Step>("details");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [signupRequestId, setSignupRequestId] = useState("");
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [smsServiceConsent, setSmsServiceConsent] = useState(false);
  const [serviceLimitationsConsent, setServiceLimitationsConsent] = useState(false);
  const [marketingEmailConsent, setMarketingEmailConsent] = useState(false);
  const [marketingSmsConsent, setMarketingSmsConsent] = useState(false);

  const isSms = channel === "sms";
  const consentOk = termsAccepted && smsServiceConsent && serviceLimitationsConsent;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SEC);
  }

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password !== passwordConfirm) {
      setError(form.passwordMismatch);
      setLoading(false);
      return;
    }

    if (!phone.trim()) {
      setError(p.phoneRequired);
      setLoading(false);
      return;
    }

    if (!consentOk) {
      setError(p.consentRequired);
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
          termsAccepted: true,
          smsServiceConsent: true,
          serviceLimitationsConsent: true,
          marketingEmailConsent,
          marketingSmsConsent,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? form.errorGeneric);
        setLoading(false);
        return;
      }

      setSignupRequestId(data.signupRequestId);
      setCodeVerified(false);
      setCode("");
      setMessage(
        data.devHint
          ? `${data.message ?? p.sentCodeMessage}\n\n${data.devHint}`
          : (data.message ?? p.sentCodeMessage),
      );
      startCooldown();
      setStep("verify");
    } catch {
      setError(form.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/check-code", {
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

      setCodeVerified(true);
      setMessage(p.verifiedMessage);
    } catch {
      setError(form.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupRequestId,
          phone: phone.trim(),
          vertical,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? form.errorGeneric);
        setLoading(false);
        return;
      }

      const base = data.redirect ?? ROUTES.settings;
      const next =
        planParam && !base.includes("plan=")
          ? `${base}${base.includes("?") ? "&" : "?"}plan=${encodeURIComponent(planParam)}`
          : base;
      router.push(next);
      router.refresh();
    } catch {
      setError(form.errorNetwork);
    } finally {
      setLoading(false);
    }
  }

  const sendDisabled = loading || cooldown > 0;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="hvac-card-elevated border-t-4 border-t-brand-500 p-8 text-slate-900">
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

            <fieldset className="space-y-2 rounded-xl border border-brand-200/80 bg-white p-4 shadow-inner-soft">
              <legend className="px-1 text-sm font-semibold text-slate-950">
                {p.verifyChannelLabel}
              </legend>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-950 has-[:checked]:ring-2 has-[:checked]:ring-brand-200">
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                  className="accent-brand-600"
                />
                <span className="text-slate-950">{p.verifyChannelEmail}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-950 has-[:checked]:ring-2 has-[:checked]:ring-brand-200">
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                  className="accent-brand-600"
                />
                <span className="text-slate-950">{p.verifyChannelSms}</span>
              </label>
              <p className="text-xs font-medium text-slate-700">{p.verifyChannelHint}</p>
            </fieldset>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brand-900">
                {p.phoneLabelRequired}
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder={ownerSignupPhonePlaceholder(email)}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="hvac-input mt-1.5"
              />
              <p className="mt-1 text-xs text-slate-500">
                {ownerSignupPhoneHint(email)}
              </p>
            </div>

            <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-900">Legal agreements</legend>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                  required
                />
                <span>
                  {p.consentTermsLabel}{" "}
                  <Link href="/terms" className="font-medium text-brand-600 underline">
                    Terms
                  </Link>
                  {" · "}
                  <Link href="/privacy" className="font-medium text-brand-600 underline">
                    Privacy
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={smsServiceConsent}
                  onChange={(e) => setSmsServiceConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                  required
                />
                <span>{p.consentSmsLabel}</span>
              </label>
              <div className="rounded-lg border border-slate-300 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {serviceLimitationsConsentTitle}
                </p>
                <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <pre className="whitespace-pre-wrap font-sans">{serviceLimitationsConsentBody}</pre>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={serviceLimitationsConsent}
                    onChange={(e) => setServiceLimitationsConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                    required
                  />
                  <span>{serviceLimitationsConsentCheckboxLabel}</span>
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={marketingEmailConsent}
                  onChange={(e) => setMarketingEmailConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                <span>{p.consentMarketingEmailLabel}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={marketingSmsConsent}
                  onChange={(e) => setMarketingSmsConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                <span>{p.consentMarketingSmsLabel}</span>
              </label>
            </fieldset>

            {error ? <ErrorBox message={error} /> : null}

            <button
              type="submit"
              disabled={sendDisabled || !consentOk}
              className="hvac-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading
                ? form.loading
                : cooldown > 0
                  ? p.sendCodeCooldown.replace("{seconds}", String(cooldown))
                  : p.sendCode}
            </button>
            <p className="text-center text-xs text-slate-500">{p.sendCodeNote}</p>
          </form>
        ) : null}

        {step === "verify" ? (
          <div className="mt-8 space-y-5">
            <form onSubmit={handleCheckCode} className="space-y-5">
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
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setCodeVerified(false);
                  }}
                  placeholder="000000"
                  className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-center font-mono text-lg tracking-widest shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <p className="mt-1 text-xs text-slate-500">{p.codeHint}</p>
              </div>

              {error ? <ErrorBox message={error} /> : null}
              {message ? <InfoBox message={message} /> : null}

              {!codeVerified ? (
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="hvac-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? form.loading : p.verifyCode}
                </button>
              ) : null}
            </form>

            {codeVerified ? (
              <form onSubmit={handleComplete} className="space-y-5 border-t border-surface-border pt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="hvac-btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? form.loading : p.completeSignup}
                </button>
              </form>
            ) : null}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={sendDisabled}
                onClick={() => void handleSendCode()}
                className="w-full text-sm font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
              >
                {cooldown > 0
                  ? p.sendCodeCooldown.replace("{seconds}", String(cooldown))
                  : p.sendCode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setCode("");
                  setCodeVerified(false);
                  setError(null);
                  setMessage(null);
                }}
                className="w-full text-sm text-slate-500 hover:text-slate-800"
              >
                {p.backToDetails}
              </button>
            </div>
          </div>
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
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-sm">
      {message}
    </p>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <p className="whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm">
      {message}
    </p>
  );
}
