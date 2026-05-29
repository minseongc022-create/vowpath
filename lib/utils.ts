import { SITE } from "./constants";

export function mailto(subject: string): string {
  return `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;
}
