import { NextResponse } from "next/server";
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  await context.params;
  return NextResponse.json(
    { error: "Verification required. Use the lookup endpoint." },
    { status: 403 },
  );
}
