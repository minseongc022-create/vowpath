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
        };
      };
    };
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
