"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { settingsPage } from "@/lib/content";
import {
  KR_PHONE_INPUT_PLACEHOLDER,
  US_EMAIL_INPUT_PLACEHOLDER,
  US_PHONE_INPUT_PLACEHOLDER,
} from "@/lib/us-contact";

type ContactState = {
  email: string;
  phone: string;
  phoneDisplay: string;
  contactComplete: boolean;
  krTestMode?: boolean;
};

export function OwnerContactSetup({
  onSaved,
}: {
  onSaved: (complete: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [krTestMode, setKrTestMode] = useState(false);
  const [smsIssues, setSmsIssues] = useState<string[]>([]);
  const [smsDevPreview, setSmsDevPreview] = useState(false);

  useEffect(() => {
    fetch("/api/sms/health?probe=1")
      .then((r) => r.json())
      .then(
        (d: {
          ready?: boolean;
          issues?: string[];
          devPreview?: boolean;
          krTestMode?: boolean;
          ownerPhoneIssue?: string | null;
          probe?: { ok?: boolean; message?: string; code?: number | null } | null;
        }) => {
          const issues = [...(d.ready ? [] : (d.issues ?? []))];
          setKrTestMode(Boolean(d.krTestMode));
          if (d.ownerPhoneIssue === "invalid_phone") {
            issues.push(settingsPage.contactPhoneNotUs);
          }
          if (d.probe && !d.probe.ok && d.probe.message && !d.devPreview) {
            issues.push(d.probe.message);
          }
          setSmsIssues(issues);
          setSmsDevPreview(Boolean(d.devPreview));
        },
      )
      .catch(() => setSmsIssues([]));
  }, []);

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/account/contact", undefined, 8_000);
      const data = (await res.json()) as ContactState & { error?: string };
      if (!res.ok || data.error) {
        setError(settingsPage.contactLoadError);
        return;
      }
      setKrTestMode(Boolean(data.krTestMode));
      setEmail(data.email ?? "");
      setPhone(data.phone ?? data.phoneDisplay ?? "");
      onSaved(Boolean(data.contactComplete));
      setSaved(Boolean(data.contactComplete));
    } catch (e) {
      setError(
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(settingsPage.contactLoadError)
          : settingsPage.contactLoadError,
      );
    } finally {
      setLoading(false);
    }
  }, [onSaved]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as ContactState & {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? settingsPage.contactSaveError);
        return;
      }
      setKrTestMode(Boolean(data.krTestMode));
      setEmail(data.email ?? email);
      setPhone(data.phone ?? phone);
      setSaved(true);
      onSaved(Boolean(data.contactComplete));
    } catch {
      setError(settingsPage.contactSaveError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">{settingsPage.contactLoading}</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {krTestMode ? settingsPage.contactIntroKr : settingsPage.contactIntro}
      </p>

      {smsDevPreview ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {settingsPage.smsTwilioDevPreview}
        </p>
      ) : null}

      {krTestMode && !smsDevPreview ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {settingsPage.contactKrTestBanner}
        </p>
      ) : null}

      {smsIssues.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="font-semibold">{settingsPage.smsTwilioNotReadyTitle}</p>
          <ul className="mt-1 list-inside list-disc text-red-800">
            {smsIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-700/90">{settingsPage.smsTwilioGeoHint}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="owner-email" className="block text-sm font-medium text-slate-800">
          {settingsPage.contactEmailLabel}
        </label>
        <input
          id="owner-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={US_EMAIL_INPUT_PLACEHOLDER}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p className="mt-1 text-xs text-slate-500">{settingsPage.contactEmailHint}</p>
      </div>

      <div>
        <label htmlFor="owner-phone" className="block text-sm font-medium text-slate-800">
          {krTestMode ? settingsPage.contactPhoneLabelKr : settingsPage.contactPhoneLabel}
        </label>
        <input
          id="owner-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder={
            krTestMode ? KR_PHONE_INPUT_PLACEHOLDER : US_PHONE_INPUT_PLACEHOLDER
          }
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p className="mt-1 text-xs text-slate-500">
          {krTestMode ? settingsPage.contactPhoneHintKr : settingsPage.contactPhoneHint}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {settingsPage.contactConfirmed}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving || !email.trim() || !phone.trim()}
        onClick={() => void handleSave()}
        className="hvac-btn-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? settingsPage.contactSaving : settingsPage.contactConfirm}
      </button>
    </div>
  );
}
