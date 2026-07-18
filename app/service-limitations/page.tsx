import { LegalDocument } from "@/components/legal/LegalDocument";
import {
  serviceLimitationsConsentBody,
  serviceLimitationsConsentTitle,
} from "@/lib/service-limitations-consent";

export default function ServiceLimitationsPage() {
  return (
    <LegalDocument
      title={serviceLimitationsConsentTitle}
      updated="August 2026"
      sections={[
        {
          heading: "Acknowledgment",
          body: serviceLimitationsConsentBody,
        },
      ]}
    />
  );
}
