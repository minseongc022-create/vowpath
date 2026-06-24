"use client";

/** Legacy loader kept for any remaining Maps JS usage. Server autocomplete is primary. */

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

async function waitForPlacesLibrary(maxMs = 8_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (window.google?.maps?.places?.Autocomplete) return;
    try {
      const g = window.google as typeof window.google & {
        maps?: { importLibrary?: (name: string) => Promise<{ Autocomplete?: unknown }> };
      };
      if (g?.maps?.importLibrary) {
        const places = await g.maps.importLibrary("places");
        if (places?.Autocomplete) return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error("PLACES_UNAVAILABLE");
}

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
      const callbackName = "__vowroadGoogleMapsReady";
      const win = window as unknown as Window & Record<string, (() => void) | undefined>;
      win[callbackName] = () => {
        void waitForPlacesLibrary()
          .then(resolve)
          .catch(reject);
      };

      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-vowroad-google-maps="1"]',
      );
      if (existing) {
        void waitForPlacesLibrary().then(resolve).catch(reject);
        return;
      }

      const script = document.createElement("script");
      script.dataset.vowroadGoogleMaps = "1";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callbackName}`;
      script.onerror = () => reject(new Error("LOAD_FAILED"));
      document.head.appendChild(script);
    });
  }

  await loadPromise;
  await waitForPlacesLibrary();
}
