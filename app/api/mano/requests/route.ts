import { NextResponse } from "next/server";
import { z } from "zod";
import { isManoServiceCategory } from "@/mano/lib/categories";
import { createRequest, listRequests } from "@/mano/lib/store";

const createSchema = z.object({
  category: z.string().refine(isManoServiceCategory, "Categoría inválida"),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  colonia: z.string().min(2).max(80),
  urgency: z.enum(["hoy", "esta_semana", "flexible"]),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  preferredDate: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const phone = url.searchParams.get("phone") ?? undefined;
  const requests = await listRequests({ status, category, phone });
  return NextResponse.json({ requests });
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
    const req = await createRequest(parsed.data);
    return NextResponse.json({ id: req.id, request: req }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
