import type { ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig } from "./vertical-config.js";

/** Vertical-specific phone intake steps injected into the Retell agent prompt. */
export function buildRetellIntakeGuide(vertical: ShopVertical): string {
  const cfg = getVerticalConfig(vertical);
  const askOnCall = cfg.optionalIntakeFields.filter((f) => f.askOnCall);
  const askIfMissing = cfg.optionalIntakeFields.filter((f) => !f.askOnCall);

  const lines: string[] = [
    `TRADE: ${cfg.label}`,
    "MANDATORY — exactly one question per turn, in this order:",
    '1. Name: "What\'s your name?"',
    '2. Address: "What\'s the full property address — street, city, and state?" If incomplete, ask only for the missing part.',
    `3. Issue: "What\'s going on there?" (${cfg.issueExamples.slice(0, 3).join("; ")})`,
  ];

  if (askOnCall.length > 0) {
    lines.push("TRADE-SPECIFIC — ask after issue, before read-back:");
    askOnCall.forEach((f, i) => {
      const prompt = f.askPrompt || f.label;
      lines.push(`${4 + i}. ${prompt}`);
    });
  }

  if (askIfMissing.length > 0) {
    lines.push("ALSO CAPTURE (ask once if not mentioned — skip if they don't know):");
    for (const f of askIfMissing) {
      if (f.key === "insuranceCarrier") {
        lines.push('- Insurance: "Do you have insurance on this? Company name is fine — claim number if you have it."');
      } else if (f.key === "insuranceClaimNumber") {
        continue;
      } else {
        lines.push(`- ${f.label}`);
      }
    }
  }

  lines.push(
    "READ-BACK: Slowly confirm name, address, issue, urgency, active loss/no-heat status, and insurance if collected. Wait for yes.",
    "CLOSING: Reassure — \"I've got everything down and our team's getting on this.\" Never quote prices or promise an exact ETA.",
  );

  return lines.join("\n");
}

export function buildReturningCustomerHint(
  match: { customerName: string; address: string } | null,
): string {
  if (!match) return "";
  const name = match.customerName.trim();
  const address = match.address.trim();
  return `RETURNING CALLER — prior record: ${name} at ${address}. Open warmly: "Welcome back — is this still for ${address}, or a different property?" If same property, confirm name only; if different, collect a fresh address.`;
}
