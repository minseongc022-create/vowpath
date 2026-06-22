"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  composeManualUsAddress,
  composeUsAddress,
  type UsAddressFieldValue,
} from "@/lib/address/us-address";
import { fetchClientPlaceDetails, fetchClientPlacePredictions } from "@/lib/address/places-client";
import { googlePlacesEnabled } from "@/lib/address/google-maps-loader";
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

type Prediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

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
  const listId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<AddressMode>("search");
  const [query, setQuery] = useState(value.formatted);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [listOpen, setListOpen] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manual, setManual] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const fetchPredictions = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (trimmed.length < 1) {
      setPredictions([]);
      setSearchStatus("ready");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearchStatus("loading");

    async function loadFromClient(): Promise<Prediction[]> {
      try {
        return await fetchClientPlacePredictions(trimmed);
      } catch {
        return [];
      }
    }

    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );
      const data = (await res.json()) as {
        predictions?: Prediction[];
        enabled?: boolean;
      };

      if (controller.signal.aborted) return;

      let next = data.predictions ?? [];

      if (next.length === 0 && (data.enabled === false || !res.ok)) {
        next = await loadFromClient();
      }

      if (next.length === 0 && res.ok && data.enabled !== false) {
        next = await loadFromClient();
      }

      if (next.length === 0 && !res.ok && data.enabled === false && !googlePlacesEnabled()) {
        setPredictions([]);
        setSearchStatus("error");
        return;
      }

      setPredictions(next);
      setSearchStatus("ready");
      setListOpen(next.length > 0);
    } catch (e) {
      if (controller.signal.aborted) return;
      const clientResults = await loadFromClient();
      if (clientResults.length > 0) {
        setPredictions(clientResults);
        setSearchStatus("ready");
        setListOpen(true);
        return;
      }
      setPredictions([]);
      setSearchStatus(googlePlacesEnabled() ? "ready" : "error");
    }
  }, []);

  useEffect(() => {
    if (mode !== "search") return;
    setQuery(value.formatted);
  }, [value.formatted, value.verified, mode]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleQueryChange(next: string) {
    setQuery(next);
    onChange({
      formatted: next,
      unit: value.unit,
      verified: false,
      placeId: undefined,
    });
    setManualError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length <= 2) {
      void fetchPredictions(next);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchPredictions(next);
    }, 60);
  }

  async function selectPrediction(prediction: Prediction) {
    setListOpen(false);
    setPredictions([]);
    setSearchStatus("loading");

    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`,
      );
      const data = (await res.json()) as {
        formattedAddress?: string;
        placeId?: string;
        error?: string;
      };

      let formatted = data.formattedAddress;
      let resolvedPlaceId = data.placeId ?? prediction.placeId;

      if (!res.ok || !formatted) {
        const clientDetails = await fetchClientPlaceDetails(prediction.placeId);
        if (clientDetails) {
          formatted = clientDetails.formattedAddress;
          resolvedPlaceId = clientDetails.placeId;
        }
      }

      if (!formatted) {
        onChange({
          formatted: prediction.description,
          unit: value.unit,
          placeId: prediction.placeId,
          verified: false,
        });
        setQuery(prediction.description);
        setSearchStatus("ready");
        return;
      }

      onChange({
        formatted,
        unit: value.unit,
        placeId: resolvedPlaceId,
        verified: true,
      });
      setQuery(formatted);
      setSearchStatus("ready");
      setManualError(null);
    } catch {
      onChange({
        formatted: prediction.description,
        unit: value.unit,
        placeId: prediction.placeId,
        verified: false,
      });
      setQuery(prediction.description);
      setSearchStatus("error");
    }
  }

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
    setSearchStatus("idle");
    setQuery(value.formatted);
  }

  function switchToManual() {
    setManualError(null);
    setMode("manual");
    setListOpen(false);
    setPredictions([]);
  }

  function retrySearch() {
    setManualError(null);
    setSearchStatus("idle");
    setMode("search");
    void fetchPredictions(query);
  }

  const composed = composeUsAddress(value);
  const showConfirmed = value.verified && composed.length > 0;
  const manualReady = manualFieldsComplete(manual);
  const hint = mode === "search" ? copy.addressHintSearch : copy.addressHintManual;

  return (
    <div className="space-y-3">
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

      <p className="text-sm leading-relaxed text-slate-600">{hint}</p>

      {mode === "search" ? (
        <div className="space-y-2">
          {searchStatus === "error" && !listOpen ? (
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
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <PinIcon />
            </span>
            <input
              id={inputId}
              type="text"
              value={query}
              disabled={disabled}
              placeholder={copy.addressPlaceholder}
              autoComplete="off"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              className={`${inputClassName} pl-11`}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (predictions.length > 0) setListOpen(true);
                if (query.trim()) void fetchPredictions(query);
              }}
              onBlur={() => {
                blurTimerRef.current = setTimeout(() => setListOpen(false), 180);
              }}
            />

            {listOpen && predictions.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                {predictions.map((p) => (
                  <li key={p.placeId} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-brand-50 active:bg-brand-100"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void selectPrediction(p)}
                    >
                      <span className="text-sm font-medium text-slate-900">{p.mainText}</span>
                      {p.secondaryText ? (
                        <span className="text-xs text-slate-500">{p.secondaryText}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {searchStatus === "loading" ? (
            <p className="text-xs text-slate-500">{copy.addressLoading}</p>
          ) : (
            <p className="text-xs text-slate-500">{copy.addressSearchReady}</p>
          )}
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
      ) : mode === "search" && query.trim() && !value.verified ? (
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
