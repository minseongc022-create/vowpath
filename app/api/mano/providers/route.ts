import { NextResponse } from "next/server";
import { z } from "zod";
import { isManoServiceCategory } from "@/mano/lib/categories";
import { createProvider, getProvider, listProviders } from "@/mano/lib/store";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().min(10).max(500),
  yearsExperience: z.number().int().min(0).max(50),
  categories: z.array(z.string().refine(isManoServiceCategory)).min(1),
  colonias: z.array(z.string()).min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const provider = await getProvider(id);
    if (!provider) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ provider });
  }
  const category = url.searchParams.get("category") ?? undefined;
  const colonia = url.searchParams.get("colonia") ?? undefined;
  const providers = await listProviders({ category, colonia });
  return NextResponse.json({ providers });
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
    const provider = await createProvider(parsed.data);
    return NextResponse.json({ id: provider.id, provider }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
