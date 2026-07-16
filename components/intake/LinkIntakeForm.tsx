"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { useLinkIntakeCopy } from "@/components/intake/LinkIntakeCopyContext";
import type { LinkIntakeCopy } from "@/lib/link-intake-copy";
import { LINK_URGENCY_OPTIONS, type LinkUrgency } from "@/lib/link-intake-urgency";
import type { SlotGridResult } from "@/lib/scheduling/slot-grid";
import type { LinkIntakeBookingView } from "@/lib/link-intake-portal";
import { LinkIntakeSubmissionPanel } from "@/components/intake/LinkIntakeSubmissionPanel";
import { LinkIntakeSlotCalendar } from "@/components/intake/LinkIntakeSlotCalendar";
import { UsAddressField } from "@/components/intake/UsAddressField";
import {
  composeUsAddress,
  emptyUsAddressValue,
  isUsAddressReady,
  type UsAddressFieldValue,
} from "@/lib/address/us-address";
import type { ShopVertical } from "@/lib/shop-vertical";

type LinkIntakeFormProps = {
  token: string;
  shopName: string;
  vertical?: ShopVertical;
};

type FormStep = "form" | "slots";

type IntakeDraft = {
  customerName: string;
  addressValue: UsAddressFieldValue;
  issueDescription: string;
  urgency: LinkUrgency;
  smsConsent: boolean;
  smsMarketingConsent: boolean;
  insuranceCarrier: string;
  insuranceClaimNumber: string;
  waterSource: string;
  activeLoss: boolean;
};

function draftStorageKey(token: string) {
  return `effiroad-intake-draft:${token}`;
}

function readDraft(token: string): IntakeDraft | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(token));
    if (!raw) return null;
    return JSON.parse(raw) as IntakeDraft;
  } catch {
    return null;
  }
}

function writeDraft(token: string, draft: IntakeDraft) {
  try {
    sessionStorage.setItem(draftStorageKey(token), JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function clearDraft(token: string) {
  try {
    sessionStorage.removeItem(draftStorageKey(token));
  } catch {
    /* ignore */
  }
}

function validateIntakeFields(
  customerName: string,
  addressValue: UsAddressFieldValue,
  issueDescription: string,
  smsConsent: boolean,
  copy: LinkIntakeCopy,
): string | null {
  if (!customerName.trim()) return copy.validateNameRequired;
  if (!isUsAddressReady(addressValue)) return copy.addressPickRequired;
  if (issueDescription.trim().length < 4) {
    return copy.validateIssueRequired;
  }
  if (!smsConsent) return copy.smsConsentRequired;
  return null;
}

function formProgress(
  name: string,
  addressValue: UsAddressFieldValue,
  issue: string,
  urgency: LinkUrgency,
): number {
  let n = 0;
  if (name.trim().length >= 2) n += 1;
  if (isUsAddressReady(addressValue)) n += 1;
  if (issue.trim().length >= 4) n += 1;
  if (urgency) n += 1;
  return Math.round((n / 4) * 100);
}

export function LinkIntakeForm({ token, shopName, vertical = "restoration" }: LinkIntakeFormProps) {
  const copy = useLinkIntakeCopy();
  const isRestoration = vertical === "restoration";
  const isHvac = vertical === "hvac";
  const [step, setStep] = useState<FormStep>("form");
  const [customerName, setCustomerName] = useState("");
  const [addressValue, setAddressValue] = useState<UsAddressFieldValue>(emptyUsAddressValue());
  const [issueDescription, setIssueDescription] = useState("");
  const [urgency, setUrgency] = useState<LinkUrgency>("this_week");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [slotGrid, setSlotGrid] = useState<SlotGridResult | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<LinkIntakeBookingView | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsMarketingConsent, setSmsMarketingConsent] = useState(false);
  const [insuranceCarrier, setInsuranceCarrier] = useState("");
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [activeLoss, setActiveLoss] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readDraft(token);
    if (!saved) return;
    setCustomerName(saved.customerName);
    setAddressValue(saved.addressValue);
    setIssueDescription(saved.issueDescription);
    setUrgency(saved.urgency);
    setSmsConsent(saved.smsConsent);
    setSmsMarketingConsent(saved.smsMarketingConsent ?? false);
    setInsuranceCarrier(saved.insuranceCarrier ?? "");
    setInsuranceClaimNumber(saved.insuranceClaimNumber ?? "");
    setWaterSource(saved.waterSource ?? "");
    setActiveLoss(saved.activeLoss ?? false);
  }, [token]);

  useEffect(() => {
    writeDraft(token, {
      customerName,
      addressValue,
      issueDescription,
      urgency,
      smsConsent,
      smsMarketingConsent,
      insuranceCarrier,
      insuranceClaimNumber,
      waterSource,
      activeLoss,
    });
  }, [
    token,
    customerName,
    addressValue,
    issueDescription,
    urgency,
    smsConsent,
    smsMarketingConsent,
    insuranceCarrier,
    insuranceClaimNumber,
    waterSource,
    activeLoss,
  ]);

  const progress = useMemo(() => {
    if (step === "slots") return 100;
    return formProgress(customerName, addressValue, issueDescription, urgency);
  }, [step, customerName, addressValue, issueDescription, urgency]);

  function onPhotoChange(file: File | null) {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function postIntake(slotId?: string) {
    const validationError = validateIntakeFields(
      customerName,
      addressValue,
      issueDescription,
      smsConsent,
      copy,
    );
    if (validationError) {
      setError(
        step === "slots"
          ? `${validationError} Tap "Go back" below to update your info, then try again.`
          : validationError,
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.set("customerName", customerName);
      form.set("address", composeUsAddress(addressValue));
      form.set("issueDescription", issueDescription);
      form.set("urgency", urgency);
      form.set("smsConsent", "1");
      if (smsMarketingConsent) form.set("smsMarketingConsent", "1");
      if (insuranceCarrier.trim()) form.set("insuranceCarrier", insuranceCarrier.trim());
      if (insuranceClaimNumber.trim()) form.set("insuranceClaimNumber", insuranceClaimNumber.trim());
      if (waterSource.trim()) form.set("waterSource", waterSource.trim());
      if (activeLoss) form.set("activeLoss", "1");
      if (slotId) form.set("slotId", slotId);
      if (photo) form.set("photo", photo);

      const res = await fetch(`/api/intake-link/${token}`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        booking?: LinkIntakeBookingView;
      };
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }
      setSubmittedBooking(data.booking);
      clearDraft(token);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFormNext(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateIntakeFields(
      customerName,
      addressValue,
      issueDescription,
      smsConsent,
      copy,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    writeDraft(token, {
      customerName,
      addressValue,
      issueDescription,
      urgency,
      smsConsent,
      smsMarketingConsent,
      insuranceCarrier,
      insuranceClaimNumber,
      waterSource,
      activeLoss,
    });
    setError(null);
    setSlotsLoading(true);
    try {
      const res = await clientFetch(
        `/api/intake-link/${token}/slots?urgency=${encodeURIComponent(urgency)}`,
        undefined,
        14_000,
      );
      const data = (await res.json()) as {
        schedulingEnabled?: boolean;
        grid?: SlotGridResult | null;
        durationMinutes?: number;
        bufferMinutes?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? copy.slotLoadFailed);
        return;
      }
      if (data.schedulingEnabled && (data.grid?.days?.length ?? 0) > 0) {
        setSlotGrid(data.grid ?? null);
        const firstOpen = data.grid?.days
          .flatMap((d) => d.slots)
          .find((s) => s.status === "available");
        setSelectedSlotId(firstOpen?.id ?? null);
        writeDraft(token, {
          customerName,
          addressValue,
          issueDescription,
          urgency,
          smsConsent,
      smsMarketingConsent,
          insuranceCarrier,
          insuranceClaimNumber,
          waterSource,
          activeLoss,
        });
        setStep("slots");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      await postIntake();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(copy.slotLoadFailed)
          : copy.networkError,
      );
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleSlotConfirm() {
    if (!selectedSlotId) {
      setError(copy.selectVisitTime);
      return;
    }

    const validationError = validateIntakeFields(
      customerName,
      addressValue,
      issueDescription,
      smsConsent,
      copy,
    );
    if (validationError) {
      setError(`${validationError} Tap "Go back" below to update your info, then try again.`);
      return;
    }

    setError(null);
    try {
      const res = await clientFetch(
        `/api/intake-link/${token}/slots?urgency=${encodeURIComponent(urgency)}`,
        undefined,
        14_000,
      );
      const data = (await res.json()) as {
        grid?: SlotGridResult | null;
        error?: string;
      };
      if (res.ok && data.grid) {
        setSlotGrid(data.grid);
        const stillOpen = data.grid.days
          .flatMap((d) => d.slots)
          .some((s) => s.id === selectedSlotId && s.status === "available");
        if (!stillOpen) {
          setError(
            "Oh no — that window just filled up! Pick another open time and we'll lock it in for you.",
          );
          const firstOpen = data.grid.days
            .flatMap((d) => d.slots)
            .find((s) => s.status === "available");
          setSelectedSlotId(firstOpen?.id ?? null);
          return;
        }
      }
    } catch {
      setError(copy.networkError);
      return;
    }
    await postIntake(selectedSlotId);
  }

  if (submittedBooking) {
    return (
      <LinkIntakeSubmissionPanel
        token={token}
        shopName={shopName}
        initialBooking={submittedBooking}
        justSubmitted
      />
    );
  }

  if (step === "slots") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-brand-50">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto max-w-md px-4 py-4">
            <p className="truncate text-sm font-bold text-brand-700">{shopName}</p>
            <p className="text-xs text-slate-500">{copy.slotStepTitle}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-md space-y-4">
            <p className="text-[15px] leading-relaxed text-slate-600">
              {copy.slotStepDescription}
            </p>

            {slotGrid ? (
              <LinkIntakeSlotCalendar
                days={slotGrid.days}
                selectedSlotId={selectedSlotId}
                durationMinutes={slotGrid.durationMinutes}
                bufferMinutes={slotGrid.bufferMinutes}
                maxConcurrentVisits={slotGrid.maxConcurrentVisits}
                onSelect={(slot) => {
                  setSelectedSlotId(slot.id);
                  setError(null);
                }}
              />
            ) : (
              <p className="text-sm text-slate-500">{copy.slotStepEmpty}</p>
            )}

            {!slotGrid?.days.some((d) => d.slots.some((s) => s.status === "available")) ? (
              <p className="text-sm text-amber-800">{copy.slotStepEmpty}</p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSlotConfirm()}
              disabled={loading}
              className="w-full rounded-2xl bg-brand-700 py-4 text-lg font-bold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? copy.submitting : copy.slotStepConfirm}
            </button>
            <button
              type="button"
              onClick={() => void postIntake()}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
            >
              {copy.slotStepSkip}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("form");
              }}
              disabled={loading}
              className="w-full py-2 text-sm text-slate-500"
            >
              {copy.slotStepBack}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormNext} className="flex min-h-[100dvh] flex-col bg-brand-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brand-700">{shopName}</p>
              <p className="text-xs font-medium text-slate-600">{copy.formStepLabel}</p>
              <p className="text-xs text-slate-500">{copy.formTitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {copy.eta}
            </span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-700 to-warm-400 transition-all duration-300"
              style={{ width: `${Math.max(progress, 8)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-2xl border border-brand-200/60 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-medium text-brand-800">{copy.formTrustBanner}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.formDescription}</p>
          </div>

          <section className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <Field label={copy.nameLabel} required>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputClass}
              autoComplete="name"
              placeholder={copy.namePlaceholder}
            />
          </Field>

          <Field label={copy.addressLabel} required>
            <UsAddressField
              value={addressValue}
              onChange={setAddressValue}
              inputClassName={inputClass}
            />
          </Field>

          <Field label={copy.issueLabel} required>
            <textarea
              required
              rows={4}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className={`${inputClass} min-h-[112px] resize-none leading-relaxed`}
              placeholder={copy.issuePlaceholder}
            />
          </Field>

          {isRestoration ? (
            <details className="group rounded-xl border border-slate-100 bg-slate-50/50">
              <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {copy.insuranceSectionToggle}
                  <span className="text-xs font-normal text-slate-400 group-open:hidden">+</span>
                </span>
              </summary>
              <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3">
                <p className="text-xs leading-relaxed text-slate-500">{copy.insuranceSectionHint}</p>
                <Field label={copy.insuranceCarrierLabel}>
                  <input
                    value={insuranceCarrier}
                    onChange={(e) => setInsuranceCarrier(e.target.value)}
                    className={inputClass}
                    autoComplete="organization"
                    placeholder={copy.insuranceCarrierPlaceholder}
                  />
                </Field>
                <Field label={copy.insuranceClaimLabel}>
                  <input
                    value={insuranceClaimNumber}
                    onChange={(e) => setInsuranceClaimNumber(e.target.value)}
                    className={inputClass}
                    placeholder={copy.insuranceClaimPlaceholder}
                  />
                </Field>
                <Field label={copy.waterSourceLabel}>
                  <input
                    value={waterSource}
                    onChange={(e) => setWaterSource(e.target.value)}
                    className={inputClass}
                    placeholder={copy.waterSourcePlaceholder}
                  />
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3">
                  <input
                    type="checkbox"
                    checked={activeLoss}
                    onChange={(e) => setActiveLoss(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700"
                  />
                  <span className="text-sm leading-relaxed text-slate-700">{copy.activeLossLabel}</span>
                </label>
              </div>
            </details>
          ) : null}

          {isHvac ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-sm font-semibold text-slate-800">System details (optional)</p>
              <div className="mt-3 space-y-4">
                <Field label="System type">
                  <input
                    value={waterSource}
                    onChange={(e) => setWaterSource(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Gas furnace, heat pump, central AC"
                  />
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3">
                  <input
                    type="checkbox"
                    checked={activeLoss}
                    onChange={(e) => setActiveLoss(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700"
                  />
                  <span className="text-sm leading-relaxed text-slate-700">No heat / no cool right now</span>
                </label>
              </div>
            </div>
          ) : null}
          </section>

          <div>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-slate-800">{copy.photoLabel}</span>
              <span className="text-xs font-normal text-slate-400">
                ({copy.photoOptional})
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">{copy.photoHint}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-700 shadow-sm transition active:bg-slate-50"
            >
              <CameraIcon />
              {photo ? copy.photoChange : copy.photoButton}
            </button>
            {photoPreview ? (
              <img
                src={photoPreview}
                alt=""
                className="mt-3 max-h-44 w-full rounded-xl object-cover ring-1 ring-slate-200"
              />
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-800">
              {copy.urgencyLabel} <span className="text-rose-500">*</span>
            </legend>
            <div className="space-y-2.5">
              {LINK_URGENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-sm transition active:scale-[0.99] ${
                    urgency === opt.id
                      ? "border-brand-700/40 ring-2 ring-brand-500/15"
                      : "border-slate-200/90"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      urgency === opt.id
                        ? "border-brand-700 bg-brand-700"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {urgency === opt.id ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-[15px] leading-snug text-slate-800">{opt.label}</span>
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.id}
                    checked={urgency === opt.id}
                    onChange={() => setUrgency(opt.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <p className="rounded-xl bg-brand-50/80 px-3 py-2.5 text-xs leading-relaxed text-brand-900/80">
            {copy.formNextSteps}
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700"
              required
            />
            <span className="text-sm leading-relaxed text-slate-700">{copy.smsConsentLabel}</span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
            <input
              type="checkbox"
              checked={smsMarketingConsent}
              onChange={(e) => setSmsMarketingConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700"
            />
            <span className="text-sm leading-relaxed text-slate-600">{copy.smsMarketingConsentLabel}</span>
          </label>

          <p className="text-xs leading-relaxed text-slate-500">
            {copy.privacyNoticePrefix}{" "}
            <Link href="/privacy" className="font-medium text-brand-700 underline" target="_blank">
              {copy.privacyLinkLabel}
            </Link>
            {" · "}
            <Link href="/terms" className="font-medium text-brand-700 underline" target="_blank">
              {copy.termsLinkLabel}
            </Link>
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-md space-y-2">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading || slotsLoading || !smsConsent}
            className="w-full rounded-2xl bg-brand-700 py-4 text-lg font-bold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading || slotsLoading ? copy.slotStepLoading : copy.submit}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-baseline gap-1 text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
