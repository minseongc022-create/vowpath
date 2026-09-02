import { NextResponse } from "next/server";
import { listCompanions, listInvitesFrom } from "@/dajeong/lib/companion-store";

export async function GET(request: Request) {
  const personId = new URL(request.url).searchParams.get("personId")?.trim();
  if (!personId) return NextResponse.json({ error: "personId가 필요해요." }, { status: 400 });
  const [companions, invites] = await Promise.all([listCompanions(personId), listInvitesFrom(personId)]);
  return NextResponse.json({ companions, invites });
}
