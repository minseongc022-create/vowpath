import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";

/** Direct signup without verification is disabled — use send-code + verify. */
export async function POST() {
  return NextResponse.json(
    { error: apiErrorsEn.verifyFirst },
    { status: 403 },
  );
}
