import type { ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig } from "./vertical-config.js";

/** Vertical-specific phone intake steps injected into the Retell agent prompt. */
export function buildRetellIntakeGuide(vertical: ShopVertical): string {
  const cfg = getVerticalConfig(vertical);
  const askOnCall = cfg.optionalIntakeFields.filter((f) => f.askOnCall);
  const askIfMissing = cfg.optionalIntakeFields.filter((f) => !f.askOnCall);

  const lines: string[] = [
    `TRADE: ${cfg.label}`,
    "ORDER — one question per turn, soft and clear:",
    '1. Name — "What\'s your name?"',
    '2. Address — "What\'s the full address — street, city, and state?" Missing piece only if incomplete.',
    `3. Issue — "What\'s going on there?" (${cfg.issueExamples.slice(0, 3).join("; ")})`,
  ];

  if (askOnCall.length > 0) {
    lines.push("TRADE-SPECIFIC — after issue, before read-back:");
    askOnCall.forEach((f, i) => {
      const prompt = f.askPrompt || f.label;
      lines.push(`${4 + i}. ${prompt}`);
    });
  }

  if (askIfMissing.length > 0) {
    lines.push("IF THEY MENTION IT — capture once, skip if unknown:");
    for (const f of askIfMissing) {
      if (f.key === "insuranceCarrier") {
        lines.push('- Insurance: "Do you have insurance on this? Company name is fine."');
      } else if (f.key === "insuranceClaimNumber") {
        continue;
      } else {
        lines.push(`- ${f.label}`);
      }
    }
  }

  lines.push(
    "READ-BACK — slowly: name, address, issue, urgency, active loss, insurance. Wait for yes.",
    "SUBMIT — submit_intake once WITHOUT slotId. Tell them a text link will let them pick the visit time. Never quote prices or promise exact ETA.",
  );

  return lines.join("\n");
}

export function buildReturningCustomerHint(
  match: { customerName: string; address: string } | null,
): string {
  if (!match) return "";
  const name = match.customerName.trim();
  const address = match.address.trim();
  return `RETURNING CALLER — prior: ${name} at ${address}. Open warmly: "Welcome back — is this still for ${address}?" Same property → confirm name only; new property → fresh address.`;
}
