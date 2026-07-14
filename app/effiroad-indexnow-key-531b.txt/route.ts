import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const KEY = readFileSync(
  join(process.cwd(), "config/indexnow.json"),
  "utf8",
);
const keyValue = JSON.parse(KEY).key as string;

/** IndexNow ownership verification — must match config/indexnow.json key. */
export async function GET() {
  return new NextResponse(`${keyValue}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
