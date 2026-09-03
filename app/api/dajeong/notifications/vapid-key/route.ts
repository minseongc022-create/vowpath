import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return NextResponse.json({ configured: false }, { status: 200 });
  return NextResponse.json({ configured: true, publicKey });
}
