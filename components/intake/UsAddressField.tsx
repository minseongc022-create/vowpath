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

  const placesAvailable = googlePlacesEnabled();
  const [mapsStatus, setMapsStatus] = useState<"idle" | "loading" | "ready" | "error">(
    placesAvailable ? "idle" : "error",
  );
  const [manualMode, setManualMode] = useState(!placesAvailable);
  const [manual, setManual] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (!placesAvailable || manualMode || disabled) return;

    let cancelled = false;
    setMapsStatus("loading");

    (async () => {
      try {
        await ensureGoogleMapsPlacesLoaded();
        if (cancelled || !inputRef.current) return;

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
        });

        setMapsStatus("ready");
      } catch {
        if (!cancelled) {
          setMapsStatus("error");
          setManualMode(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      listenerRef.current?.remove();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mode
  }, [placesAvailable, manualMode, disabled]);

  useEffect(() => {
    if (!inputRef.current) return;
    if (value.verified && value.formatted && inputRef.current.value !== value.formatted) {
      inputRef.current.value = value.formatted;
    }
  }, [value.formatted, value.verified]);

  function handleManualApply() {
    const next = composeManualUsAddress({
      street: manual.street,
      city: manual.city,
      state: manual.state,
      zip: manual.zip,
      unit: value.unit,
    });
    onChange(next);
  }

  const composed = composeUsAddress(value);
  const showConfirmed = value.verified && composed.length > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">{copy.addressHint}</p>

      {!manualMode ? (
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
            autoComplete="off"
            className={`${inputClassName} pl-11`}
            onChange={() => {
              onChange({
                formatted: inputRef.current?.value ?? "",
                unit: value.unit,
                verified: false,
              });
            }}
          />
          {mapsStatus === "loading" ? (
            <p className="mt-1.5 text-xs text-slate-400">{copy.addressLoading}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">{copy.addressManualTitle}</p>
          <input
            value={manual.street}
            onChange={(e) => setManual((m) => ({ ...m, street: e.target.value }))}
            placeholder={copy.addressManualStreet}
            className={inputClassName}
            autoComplete="address-line1"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={manual.city}
              onChange={(e) => setManual((m) => ({ ...m, city: e.target.value }))}
              placeholder={copy.addressManualCity}
              className={inputClassName}
              autoComplete="address-level2"
            />
            <input
              value={manual.state}
              onChange={(e) =>
                setManual((m) => ({ ...m, state: e.target.value.toUpperCase().slice(0, 2) }))
              }
              placeholder={copy.addressManualState}
              className={inputClassName}
              autoComplete="address-level1"
              maxLength={2}
            />
          </div>
          <input
            value={manual.zip}
            onChange={(e) =>
              setManual((m) => ({ ...m, zip: e.target.value.replace(/[^\d-]/g, "").slice(0, 10) }))
            }
            placeholder={copy.addressManualZip}
            className={inputClassName}
            autoComplete="postal-code"
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={handleManualApply}
            className="w-full rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-900"
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
      ) : null}

      {placesAvailable && !manualMode ? (
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-brand-800 hover:underline"
        >
          {copy.addressManualSwitch}
        </button>
      ) : null}

      {manualMode && placesAvailable ? (
        <button
          type="button"
          onClick={() => {
            setManualMode(false);
            setMapsStatus("idle");
          }}
          className="text-xs font-medium text-brand-800 underline-offset-2 hover:underline"
        >
          {copy.addressSearchSwitch}
        </button>
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
