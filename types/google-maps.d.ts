export {};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              types?: string[];
              componentRestrictions?: { country: string | string[] };
              fields?: string[];
            },
          ) => GooglePlacesAutocomplete;
          AutocompleteService: new () => GoogleAutocompleteService;
          PlacesService: new (container: HTMLElement) => GooglePlacesService;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            [key: string]: string;
          };
        };
        importLibrary?: (name: string) => Promise<Record<string, unknown>>;
      };
    };
  }

  interface GoogleAutocompletePrediction {
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }

  interface GoogleAutocompleteService {
    getPlacePredictions(
      request: {
        input: string;
        types?: string[];
        componentRestrictions?: { country: string | string[] };
      },
      callback: (
        predictions: GoogleAutocompletePrediction[] | null,
        status: string,
      ) => void,
    ): void;
  }

  interface GooglePlacesService {
    getDetails(
      request: { placeId: string; fields: string[] },
      callback: (
        place: { formatted_address?: string; place_id?: string } | null,
        status: string,
      ) => void,
    ): void;
  }

  interface GooglePlacesAutocomplete {
    addListener(event: string, handler: () => void): { remove(): void };
    getPlace(): {
      place_id?: string;
      formatted_address?: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };
  }
}
