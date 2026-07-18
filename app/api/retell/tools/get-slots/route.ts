import { NextResponse } from "next/server";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { offerSlotGridForTenant, offerVisitSlotsForTenant } from "@/lib/scheduling/offer-slots";
import { matchPreferredVisitSlot } from "@/lib/scheduling/match-preferred-slot";

type RetellArgs = {
  priority?: string;
  /** Shop-local date YYYY-MM-DD when caller names a day */
  preferredDate?: string;
  /** Shop-local time HH:MM (24h) when caller names a time */
  preferredTime?: string;
};

/**
 * Retell custom function — list open visit windows from the live slot grid.
 * Optional preferredDate/preferredTime checks caller-requested time against crew capacity.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateRetellWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ result: "Could not read request." }, { status: 400 });
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const to = String(call.to_number ?? body.to_number ?? "");
  const from = String(call.from_number ?? body.from_number ?? "");
  const args = (body.args ?? body.arguments ?? {}) as RetellArgs;

  const userId = await resolveTenantUserId({ to, from });
  if (!userId || !(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result: "Scheduling is not available on this line right now.",
    });
  }

  const priorityRaw = String(args.priority ?? "P2").toUpperCase();
  const priority =
    priorityRaw === "P1" || priorityRaw === "P3" ? priorityRaw : ("P2" as const);

  const [slots, grid] = await Promise.all([
    offerVisitSlotsForTenant({ userId, priority }),
    offerSlotGridForTenant({ userId, priority }),
  ]);

  if (!slots.length || !grid) {
    return NextResponse.json({
      result:
        "No open visit windows in the next two weeks within business hours. Take their details and say the office will call to schedule.",
      slots: [],
    });
  }

  const source = slots[0]?.source ?? "native";
  const preferredMatch = matchPreferredVisitSlot({
    grid,
    source,
    preferredDate: args.preferredDate,
    preferredTime: args.preferredTime,
  });

  const lines = slots.map((s, i) => `${i + 1}. ${s.label} (id: ${s.id})`);
  const slotPayload = slots.map((s) => ({ id: s.id, label: s.label, startAt: s.startAt }));

  if (preferredMatch?.status === "available") {
    return NextResponse.json({
      result:
        `Requested time is available: ${preferredMatch.slot.label} (id: ${preferredMatch.slot.id}). Confirm with the caller, then pass that slotId to submit_intake.\n\n` +
        `Other open windows if needed:\n${lines.join("\n")}`,
      match: "available",
      matchedSlot: preferredMatch.slot,
      slots: slotPayload,
    });
  }

  if (preferredMatch) {
    const next = preferredMatch.nextAvailable;
    const nextLine = next
      ? `Next earliest available: ${next.label} (id: ${next.id}).`
      : "No other windows open soon.";
    return NextResponse.json({
      result:
        `${preferredMatch.message} ${nextLine}\n\nOpen visit windows (business hours only):\n${lines.join("\n")}\n` +
        "Never offer times outside this list. Ask which works best, then pass slotId to submit_intake.",
      match: preferredMatch.status,
      nextAvailable: next,
      slots: slotPayload,
    });
  }

  return NextResponse.json({
    result:
      `Open visit windows (shop operating hours only — never invent times outside this list):\n${lines.join("\n")}\n` +
      "If the caller names a preferred day/time, call get_open_slots again with preferredDate (YYYY-MM-DD) and preferredTime (HH:MM shop local). " +
      "Ask which works best, then pass slotId to submit_intake.",
    slots: slotPayload,
  });
}
