export type AddressValidationResult = {
  valid: boolean;
  formattedAddress?: string;
  provider: "google" | "heuristic" | "skipped";
  message?: string;
};

const US_ZIP = /\b\d{5}(?:-\d{4})?\b/;
const STREET_NUMBER = /^\s*\d+\s+\S+/;

function heuristicValidate(address: string): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") {
    return { valid: false, provider: "heuristic", message: "Address missing" };
  }
  if (trimmed.length < 8) {
    return { valid: false, provider: "heuristic", message: "Address too short" };
  }
  if (!STREET_NUMBER.test(trimmed) && !/\d/.test(trimmed)) {
    return {
      valid: false,
      provider: "heuristic",
      message: "Street number not detected",
    };
  }
  const hasCityHint =
    /,\s*[A-Za-z]{2,}/.test(trimmed) ||
    US_ZIP.test(trimmed) ||
    /\b(tx|texas|ca|california|fl|florida|ny|new york)\b/i.test(trimmed);
  if (!hasCityHint) {
    return {
      valid: false,
      provider: "heuristic",
      message: "City, state, or ZIP not detected",
    };
  }
  return { valid: true, formattedAddress: trimmed, provider: "heuristic" };
}

async function validateWithGoogle(address: string): Promise<AddressValidationResult> {
  const apiKey =
    process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return heuristicValidate(address);
  }

  try {
    const res = await fetch(
      "https://addressvalidation.googleapis.com/v1:validateAddress?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            regionCode: "US",
            addressLines: [address],
          },
        }),
      },
    );

    if (!res.ok) {
      console.warn("[address-validation] Google API", res.status);
      return heuristicValidate(address);
    }

    const data = (await res.json()) as {
      result?: {
        verdict?: { addressComplete?: boolean; validationGranularity?: string };
        address?: { formattedAddress?: string };
      };
    };

    const verdict = data.result?.verdict;
    const formatted = data.result?.address?.formattedAddress?.trim();
    const complete =
      verdict?.addressComplete === true ||
      verdict?.validationGranularity === "PREMISE" ||
      verdict?.validationGranularity === "SUB_PREMISE";

    if (complete && formatted) {
      return {
        valid: true,
        formattedAddress: formatted,
        provider: "google",
      };
    }

    return {
      valid: false,
      provider: "google",
      message: "Google could not verify address",
      formattedAddress: formatted,
    };
  } catch (e) {
    console.warn("[address-validation] Google error", e);
    return heuristicValidate(address);
  }
}

export async function validateServiceAddress(
  address: string,
  options?: { fallbackToHeuristic?: boolean },
): Promise<AddressValidationResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, provider: "skipped", message: "Empty address" };
  }

  const useGoogle =
    process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (useGoogle) {
    const google = await validateWithGoogle(trimmed);
    if (google.valid || !options?.fallbackToHeuristic) {
      return google;
    }
    return heuristicValidate(trimmed);
  }

  return heuristicValidate(trimmed);
}

export const ADDRESS_VERIFY_FAIL_PROMPT =
  "I couldn't verify that address. Could you repeat your full street address, city, and state?";
