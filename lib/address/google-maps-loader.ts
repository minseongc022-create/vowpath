"use client";

export function getPublicGoogleMapsApiKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

export function googlePlacesEnabled(): boolean {
  return Boolean(getPublicGoogleMapsApiKey());
}

let loadPromise: Promise<void> | null = null;

export async function ensureGoogleMapsPlacesLoaded(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only load in the browser.");
  }

  const key = getPublicGoogleMapsApiKey();
  if (!key) throw new Error("NO_GOOGLE_MAPS_KEY");

  if (window.google?.maps?.places?.Autocomplete) {
    return;
  }

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-vowpath-google-maps="1"]',
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("LOAD_FAILED")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.dataset.vowpathGoogleMaps = "1";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("LOAD_FAILED"));
      document.head.appendChild(script);
    });
  }

  await loadPromise;

  if (!window.google?.maps?.places?.Autocomplete) {
    throw new Error("PLACES_UNAVAILABLE");
  }
}
