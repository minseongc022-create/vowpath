import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptQuote, createQuote, listQuotes } from "@/mano/lib/store";

const createSchema = z.object({
  requestId: z.string().min(1),
  providerId: z.string().min(1),
  amountMxn: z.number().positive().max(500_000),
  message: z.string().min(5).max(500),
  estimatedHours: z.number().positive().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") ?? undefined;
  const providerId = url.searchParams.get("providerId") ?? undefined;
  const quotes = await listQuotes({ requestId, providerId });
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    const quote = await createQuote(parsed.data);
    return NextResponse.json({ quote }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { quoteId?: string; action?: string };
    if (body.action === "accept" && body.quoteId) {
      const req = await acceptQuote(body.quoteId);
      if (!req) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
      return NextResponse.json({ request: req });
    }
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
