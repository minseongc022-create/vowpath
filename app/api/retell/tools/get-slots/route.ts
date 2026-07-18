import { NextResponse } from "next/server";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { offerVisitSlotsForTenant } from "@/lib/scheduling/offer-slots";

type RetellArgs = {
  priority?: string;
};

/**
 * Retell custom function — list open visit windows from the live slot grid.
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

  const slots = await offerVisitSlotsForTenant({ userId, priority });
  if (!slots.length) {
    return NextResponse.json({
      result:
        "No open visit windows in the next two weeks. Take their details and say the office will call to schedule.",
      slots: [],
    });
  }

  const lines = slots.map((s, i) => `${i + 1}. ${s.label} (id: ${s.id})`);
  return NextResponse.json({
    result: `Open visit windows:\n${lines.join("\n")}\nAsk which works best, then pass slotId to submit_intake.`,
    slots: slots.map((s) => ({ id: s.id, label: s.label, startAt: s.startAt })),
  });
}
