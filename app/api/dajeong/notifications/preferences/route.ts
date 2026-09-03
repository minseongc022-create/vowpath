import { NextResponse } from "next/server";
import { z } from "zod";
import { getPreferences, setPreferences } from "@/dajeong/lib/notification-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

export async function GET(request: Request) {
  const personId = new URL(request.url).searchParams.get("personId")?.trim();
  if (!personId) return NextResponse.json({ error: "personId가 필요해요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  return NextResponse.json({ preferences: await getPreferences(personId) });
}

const schema = z.object({
  personId: z.string().trim().min(1).max(80),
  masterEnabled: z.boolean().optional(),
  categories: z.object({
    departure: z.boolean().optional(),
    prep: z.boolean().optional(),
    execution: z.boolean().optional(),
    weather: z.boolean().optional(),
    sharedPlanChanges: z.boolean().optional(),
    proactiveSuggestions: z.boolean().optional(),
  }).partial().optional(),
  secretPrivacyLevel: z.enum(["normal", "content_hidden", "off"]).optional(),
  quietHours: z.object({ startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/) }).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "설정 값을 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const { personId, ...rest } = parsed.data;
  const preferences = await setPreferences(personId, rest);
  return NextResponse.json({ preferences });
}
