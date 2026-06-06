"use client";

import { useMemo, useRef, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { LINK_URGENCY_OPTIONS, type LinkUrgency } from "@/lib/link-intake-urgency";
import type { SlotOffer } from "@/lib/booking-settings";
import type { LinkIntakeBookingView } from "@/lib/link-intake-portal";
import { LinkIntakeSubmissionPanel } from "@/components/intake/LinkIntakeSubmissionPanel";

type LinkIntakeFormProps = {
  token: string;
  shopName: string;
};

type FormStep = "form" | "slots";

function formProgress(
  name: string,
  address: string,
  issue: string,
  urgency: LinkUrgency,
): number {
  let n = 0;
  if (name.trim().length >= 2) n += 1;
  if (address.trim().length >= 5) n += 1;
  if (issue.trim().length >= 4) n += 1;
  if (urgency) n += 1;
  return Math.round((n / 4) * 100);
}

export function LinkIntakeForm({ token, shopName }: LinkIntakeFormProps) {
  const [step, setStep] = useState<FormStep>("form");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [urgency, setUrgency] = useState<LinkUrgency>("this_week");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotOffer[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<LinkIntakeBookingView | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const progress = useMemo(() => {
    if (step === "slots") return 100;
    return formProgress(customerName, address, issueDescription, urgency);
  }, [step, customerName, address, issueDescription, urgency]);

  function onPhotoChange(file: File | null) {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function postIntake(slotId?: string) {
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.set("customerName", customerName);
      form.set("address", address);
      form.set("issueDescription", issueDescription);
      form.set("urgency", urgency);
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
        setError(data.error ?? "제출에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      setSubmittedBooking(data.booking);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("네트워크 오류입니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFormNext(e: React.FormEvent) {
    e.preventDefault();
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
        slots?: SlotOffer[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "시간을 불러오지 못했습니다.");
        return;
      }
      if (data.schedulingEnabled && (data.slots?.length ?? 0) > 0) {
        setSlots(data.slots ?? []);
        setSelectedSlotId(data.slots?.[0]?.id ?? null);
        setStep("slots");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      await postIntake();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("시간 선택을 불러오지 못했습니다. 다시 시도해 주세요.")
          : "네트워크 오류입니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleSlotConfirm() {
    if (!selectedSlotId) {
      setError("방문 시간을 선택해 주세요.");
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
      <div className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto max-w-md px-4 py-4">
            <p className="truncate text-sm font-bold text-[#0c4a6e]">{shopName}</p>
            <p className="text-xs text-slate-500">{copy.slotStepTitle}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-36 pt-5">
          <div className="mx-auto max-w-md space-y-4">
            <p className="text-[15px] leading-relaxed text-slate-600">
              {copy.slotStepDescription}
            </p>

            <div className="space-y-2.5">
              {slots.map((slot, i) => (
                <label
                  key={slot.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-4 shadow-sm ${
                    selectedSlotId === slot.id
                      ? "border-[#0c4a6e]/40 ring-2 ring-[#0c4a6e]/15"
                      : "border-slate-200/90"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-medium text-slate-800">{slot.label}</span>
                  <input
                    type="radio"
                    name="slot"
                    value={slot.id}
                    checked={selectedSlotId === slot.id}
                    onChange={() => setSelectedSlotId(slot.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>

            {slots.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.slotStepEmpty}</p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            <button
              type="button"
              onClick={() => void handleSlotConfirm()}
              disabled={loading || !selectedSlotId}
              className="w-full rounded-2xl bg-[#0c4a6e] py-4 text-lg font-bold text-white shadow-lg shadow-[#0c4a6e]/20 transition hover:bg-[#0a3d5c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={() => setStep("form")}
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
    <form onSubmit={handleFormNext} className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0c4a6e]">{shopName}</p>
              <p className="text-xs text-slate-500">{copy.formTitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {copy.eta}
            </span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0c4a6e] to-[#2563eb] transition-all duration-300"
              style={{ width: `${Math.max(progress, 8)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-5">
        <div className="mx-auto max-w-md space-y-6">
          <p className="text-[15px] leading-relaxed text-slate-600">{copy.formDescription}</p>

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
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              autoComplete="street-address"
              placeholder={copy.addressPlaceholder}
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
                      ? "border-[#0c4a6e]/40 ring-2 ring-[#0c4a6e]/15"
                      : "border-slate-200/90"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      urgency === opt.id
                        ? "border-[#0c4a6e] bg-[#0c4a6e]"
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

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <button
            type="submit"
            disabled={loading || slotsLoading || progress < 75}
            className="w-full rounded-2xl bg-[#0c4a6e] py-4 text-lg font-bold text-white shadow-lg shadow-[#0c4a6e]/20 transition hover:bg-[#0a3d5c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading || slotsLoading ? copy.slotStepLoading : copy.submit}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0c4a6e]/50 focus:ring-2 focus:ring-[#0c4a6e]/12";

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
