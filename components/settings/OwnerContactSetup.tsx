"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { settingsPage } from "@/lib/content";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";
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
  onValidChange,
}: {
  onSaved: (complete: boolean) => void;
  onValidChange?: (valid: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const persist = useCallback(async () => {
    if (!email.trim() || !phone.trim()) {
      setError(settingsPage.contactSaveError);
      return false;
    }
    setError(null);
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
        return false;
      }
      setKrTestMode(Boolean(data.krTestMode));
      setEmail(data.email ?? email);
      setPhone(data.phone ?? phone);
      onSaved(Boolean(data.contactComplete));
      return true;
    } catch {
      setError(settingsPage.contactSaveError);
      return false;
    }
  }, [email, onSaved, phone]);

  useSettingsSaveRegistration("contact", persist, !loading);

  const valid = Boolean(email.trim() && phone.trim());

  useEffect(() => {
    onValidChange?.(valid);
  }, [onValidChange, valid]);

  if (loading) {
    return <p className="vow-settings-muted">{settingsPage.contactLoading}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="vow-settings-hint">
        {krTestMode ? settingsPage.contactIntroKr : settingsPage.contactIntro}
      </p>

      {smsDevPreview ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-base text-amber-900">
          {settingsPage.smsTwilioDevPreview}
        </p>
      ) : null}

      {krTestMode && !smsDevPreview ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-base text-sky-900">
          {settingsPage.contactKrTestBanner}
        </p>
      ) : null}

      {smsIssues.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-900">
          <p className="font-semibold">{settingsPage.smsTwilioNotReadyTitle}</p>
          <ul className="mt-1 list-inside list-disc text-red-800">
            {smsIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-red-700/90">{settingsPage.smsTwilioGeoHint}</p>
        </div>
      ) : null}

      <div className="vow-settings-field">
        <label htmlFor="owner-email" className="vow-settings-label block">
          {settingsPage.contactEmailLabel}{" "}
          <span className="vow-settings-required" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> ({settingsPage.contactRequiredMark})</span>
        </label>
        <input
          id="owner-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-required="true"
          placeholder={US_EMAIL_INPUT_PLACEHOLDER}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="vow-settings-input mt-2"
        />
        <p className="vow-settings-hint mt-1.5 text-sm">{settingsPage.contactEmailHint}</p>
      </div>

      <div className="vow-settings-field">
        <label htmlFor="owner-phone" className="vow-settings-label block">
          {krTestMode ? settingsPage.contactPhoneLabelKr : settingsPage.contactPhoneLabel}{" "}
          <span className="vow-settings-required" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> ({settingsPage.contactRequiredMark})</span>
        </label>
        <input
          id="owner-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          aria-required="true"
          placeholder={
            krTestMode ? KR_PHONE_INPUT_PLACEHOLDER : US_PHONE_INPUT_PLACEHOLDER
          }
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError(null);
          }}
          className="vow-settings-input mt-2"
        />
        <p className="vow-settings-hint mt-1.5 text-sm">
          {krTestMode ? settingsPage.contactPhoneHintKr : settingsPage.contactPhoneHint}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-base text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
