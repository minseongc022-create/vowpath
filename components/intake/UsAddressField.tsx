"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ensureGoogleMapsPlacesLoaded, googlePlacesEnabled } from "@/lib/address/google-maps-loader";
import {
  composeManualUsAddress,
  composeUsAddress,
  type UsAddressFieldValue,
} from "@/lib/address/us-address";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";

const defaultInputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

type UsAddressFieldProps = {
  value: UsAddressFieldValue;
  onChange: (value: UsAddressFieldValue) => void;
  inputClassName?: string;
  disabled?: boolean;
};

type AddressMode = "search" | "manual";

function manualFieldsComplete(manual: { street: string; city: string; state: string; zip: string }) {
  return (
    manual.street.trim().length > 0 &&
    manual.city.trim().length > 0 &&
    manual.state.trim().length >= 2 &&
    manual.zip.trim().length >= 5
  );
}

export function UsAddressField({
  value,
  onChange,
  inputClassName = defaultInputClass,
  disabled = false,
}: UsAddressFieldProps) {
  const inputId = useId();
  const unitId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GooglePlacesAutocomplete | null>(null);
  const listenerRef = useRef<{ remove(): void } | null>(null);
  const initAttemptRef = useRef(0);

  const placesAvailable = googlePlacesEnabled();
  const [mode, setMode] = useState<AddressMode>(placesAvailable ? "search" : "manual");
  const [mapsStatus, setMapsStatus] = useState<"idle" | "loading" | "ready" | "error">(
    placesAvailable ? "idle" : "error",
  );
  const [manualError, setManualError] = useState<string | null>(null);
  const [manual, setManual] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (!placesAvailable || mode !== "search" || disabled) return;

    let cancelled = false;
    initAttemptRef.current += 1;
    const attempt = initAttemptRef.current;
    setMapsStatus("loading");

    (async () => {
      try {
        await ensureGoogleMapsPlacesLoaded();
        if (cancelled || attempt !== initAttemptRef.current || !inputRef.current) return;

        listenerRef.current?.remove();
        autocompleteRef.current = null;

        const ac = new window.google!.maps!.places!.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "formatted_address", "geometry", "place_id"],
        });
        autocompleteRef.current = ac;

        listenerRef.current = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place.formatted_address?.trim() ?? "";
          if (!formatted) return;
          onChange({
            formatted,
            unit: value.unit,
            placeId: place.place_id,
            verified: true,
          });
          setManualError(null);
        });

        if (!cancelled && attempt === initAttemptRef.current) {
          setMapsStatus("ready");
        }
      } catch {
        if (!cancelled && attempt === initAttemptRef.current) {
          setMapsStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      listenerRef.current?.remove();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when switching back to search
  }, [placesAvailable, mode, disabled]);

  useEffect(() => {
    if (!inputRef.current) return;
    if (value.verified && value.formatted && inputRef.current.value !== value.formatted) {
      inputRef.current.value = value.formatted;
    }
  }, [value.formatted, value.verified]);

  function handleManualApply() {
    if (!manualFieldsComplete(manual)) {
      setManualError(copy.addressManualIncomplete);
      return;
    }

    const next = composeManualUsAddress({
      street: manual.street,
      city: manual.city,
      state: manual.state,
      zip: manual.zip,
      unit: value.unit,
    });

    if (!next.verified) {
      setManualError(copy.addressManualInvalid);
      return;
    }

    setManualError(null);
    onChange(next);
  }

  function switchToSearch() {
    setManualError(null);
    setMode("search");
    setMapsStatus("idle");
  }

  function switchToManual() {
    setManualError(null);
    setMode("manual");
  }

  function retrySearch() {
    setManualError(null);
    setMapsStatus("idle");
    setMode("search");
  }

  const composed = composeUsAddress(value);
  const showConfirmed = value.verified && composed.length > 0;
  const manualReady = manualFieldsComplete(manual);
  const hint =
    mode === "search" && placesAvailable ? copy.addressHintSearch : copy.addressHintManual;

  return (
    <div className="space-y-3">
      {placesAvailable ? (
        <div
          className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1"
          role="tablist"
          aria-label={copy.addressLabel}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "search"}
            onClick={switchToSearch}
            disabled={disabled}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === "search"
                ? "bg-white text-brand-900 shadow-sm"
                : "text-slate-600 hover:text-brand-900"
            }`}
          >
            {copy.addressTabSearch}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "manual"}
            onClick={switchToManual}
            disabled={disabled}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === "manual"
                ? "bg-white text-brand-900 shadow-sm"
                : "text-slate-600 hover:text-brand-900"
            }`}
          >
            {copy.addressTabManual}
          </button>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-slate-600">{hint}</p>

      {mode === "search" && placesAvailable ? (
        <div className="space-y-2">
          {mapsStatus === "error" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
              <p>{copy.addressSearchError}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={retrySearch}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 ring-1 ring-brand-200"
                >
                  {copy.addressSearchRetry}
                </button>
                <button
                  type="button"
                  onClick={switchToManual}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-800 underline-offset-2 hover:underline"
                >
                  {copy.addressTabManual}
                </button>
              </div>
            </div>
          ) : null}

          <div className="relative">
            <label htmlFor={inputId} className="sr-only">
              {copy.addressLabel}
            </label>
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <PinIcon />
            </span>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              defaultValue={value.formatted}
              disabled={disabled || mapsStatus === "loading"}
              placeholder={copy.addressPlaceholder}
              autoComplete="street-address"
              className={`${inputClassName} pl-11`}
              onChange={() => {
                onChange({
                  formatted: inputRef.current?.value ?? "",
                  unit: value.unit,
                  verified: false,
                });
                setManualError(null);
              }}
            />
          </div>

          {mapsStatus === "loading" ? (
            <p className="text-xs text-slate-500">{copy.addressLoading}</p>
          ) : mapsStatus === "ready" ? (
            <p className="text-xs text-slate-500">{copy.addressSearchReady}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <input
            value={manual.street}
            onChange={(e) => {
              setManual((m) => ({ ...m, street: e.target.value }));
              setManualError(null);
            }}
            placeholder={copy.addressManualStreet}
            className={inputClassName}
            autoComplete="address-line1"
            aria-label={copy.addressManualStreet}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={manual.city}
              onChange={(e) => {
                setManual((m) => ({ ...m, city: e.target.value }));
                setManualError(null);
              }}
              placeholder={copy.addressManualCity}
              className={inputClassName}
              autoComplete="address-level2"
              aria-label={copy.addressManualCity}
            />
            <input
              value={manual.state}
              onChange={(e) => {
                setManual((m) => ({
                  ...m,
                  state: e.target.value.toUpperCase().slice(0, 2),
                }));
                setManualError(null);
              }}
              placeholder={copy.addressManualState}
              className={inputClassName}
              autoComplete="address-level1"
              maxLength={2}
              aria-label={copy.addressManualState}
            />
          </div>
          <input
            value={manual.zip}
            onChange={(e) => {
              setManual((m) => ({
                ...m,
                zip: e.target.value.replace(/[^\d-]/g, "").slice(0, 10),
              }));
              setManualError(null);
            }}
            placeholder={copy.addressManualZip}
            className={inputClassName}
            autoComplete="postal-code"
            inputMode="numeric"
            aria-label={copy.addressManualZip}
          />
          {manualError ? (
            <p className="text-sm text-rose-700" role="alert">
              {manualError}
            </p>
          ) : !manualReady ? (
            <p className="text-xs text-slate-500">{copy.addressManualIncomplete}</p>
          ) : null}
          <button
            type="button"
            onClick={handleManualApply}
            disabled={disabled || !manualReady}
            className="w-full rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {copy.addressManualApply}
          </button>
        </div>
      )}

      <div>
        <label htmlFor={unitId} className="mb-1.5 block text-xs font-medium text-slate-600">
          {copy.addressUnitLabel}
        </label>
        <input
          id={unitId}
          type="text"
          value={value.unit}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              unit: e.target.value,
            })
          }
          placeholder={copy.addressUnitPlaceholder}
          className={inputClassName}
          autoComplete="address-line2"
        />
      </div>

      {showConfirmed ? (
        <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
            ✓
          </span>
          <span>
            <span className="font-medium">{copy.addressConfirmedLabel}</span>
            <span className="mt-0.5 block text-emerald-800/90">{composed}</span>
          </span>
        </div>
      ) : mode === "search" && placesAvailable && mapsStatus === "ready" && value.formatted && !value.verified ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          {copy.addressPickRequired}
        </p>
      ) : null}
    </div>
  );
}

function PinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
