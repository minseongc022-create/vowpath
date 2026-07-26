import { getPortalBaseUrl } from "./portal-url";

/** Shared test fixtures for live field / SMS testing (US restoration). */
export const FIELD_TEST_CUSTOMER = {
  name: "John Smith",
  phone: "+821055969438",
  phoneDisplay: "010-5596-9438 (KR — Twilio verified)",
  address: "1234 Barton Springs Rd, Austin, TX 78704",
  issue: "AC blowing warm air — not cooling upstairs",
  urgency: "This week works",
  arrivalWindow: "Tue 9 AM–11 AM",
} as const;

export const FIELD_TEST_TECH = {
  name: "Mike Rivera",
  phone: "+15125550199",
  phoneDisplay: "(512) 555-0199 (US test line)",
} as const;

export function buildFieldTestGuide(params: {
  shopName?: string;
  shopPhone?: string;
  portalUrl?: string;
  ownerPhone?: string;
}) {
  const shop = params.shopName?.trim() || "Your Restoration Company";
  const twilio = params.shopPhone?.trim() || process.env.TWILIO_PHONE_NUMBER || "+12255291680";
  const portal = params.portalUrl?.trim() || getPortalBaseUrl() || "https://link.effiroad.com";
  const ownerPhone = params.ownerPhone?.trim() || FIELD_TEST_CUSTOMER.phone;
  const testTech = {
    name: "You (test tech)",
    phone: ownerPhone,
    phoneDisplay: `${ownerPhone} — use this in Settings → Crew assignment`,
  };

  return {
    title: "Effiroad field test checklist",
    shopName: shop,
    numbers: {
      customerCalls: twilio,
      customerSmsReceives: FIELD_TEST_CUSTOMER.phone,
      techSmsReceives: ownerPhone,
      ownerSmsReceives: ownerPhone,
      note: "Tech job offers copy to your owner phone if crew uses a different number. For solo test, set Crew tech phone = your mobile.",
    },
    testCustomer: FIELD_TEST_CUSTOMER,
    testTech,
    portalBaseUrl: portal,
    flows: [
      {
        id: "link_intake",
        title: "1. Book via SMS link",
        steps: [
          `Call ${twilio} → press 1 (service) → press 1 (text link)`,
          `Customer phone ${FIELD_TEST_CUSTOMER.phone} receives link`,
          `Open link → name: ${FIELD_TEST_CUSTOMER.name}`,
          `Address: ${FIELD_TEST_CUSTOMER.address}`,
          `Issue: ${FIELD_TEST_CUSTOMER.issue}`,
          "Pick an arrival window → submit",
        ],
      },
      {
        id: "owner_approve",
        title: "2. Approve in dashboard",
        steps: [
          "Dashboard → open the new request",
          "Approve (or auto-book if P2/P3 clear)",
          "Tech gets job offer SMS if Crew dispatch enabled",
        ],
      },
      {
        id: "tech_accept_otw",
        title: "3. Tech accepts + On my way",
        steps: [
          `From YOUR phone (crew tech #): reply 1 to job offer`,
          "Then reply 30 when heading out (or 5, 10, 15, 45, 60)",
          `Customer ${FIELD_TEST_CUSTOMER.phone} gets ETA SMS (same as your customer test # if solo)`,
        ],
      },
      {
        id: "dashboard_otw",
        title: "4. Or notify from dashboard",
        steps: [
          "Open booking detail → Customer on the way",
          "Tap 5 / 10 / 15 / 30 / 45 / 60 min — same customer SMS",
        ],
      },
    ],
    devSmsSmoke: {
      endpoint: "POST /api/dev/sms-smoke",
      body: {
        live: true,
        targetPhone: FIELD_TEST_CUSTOMER.phone,
        flows: ["customer_on_my_way", "link_intake"],
      },
    },
    settings: {
      shopName: "Settings → Shop name (shows in SMS, not Effiroad)",
      visitHours: "Settings → Booking → Business hours for visits",
      crew: "Settings → Crew: tech phone = STAFF line (not customer). Customer phone on booking = customer only. Same 010 for both? Use dashboard for ETA.",
    },
  };
}
