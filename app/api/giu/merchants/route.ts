import { NextResponse } from "next/server";
import { listMerchants } from "@/giu/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const district = url.searchParams.get("district") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const merchants = await listMerchants({ district, category });
  return NextResponse.json({ merchants });
}

/** Legacy unauthenticated signup — redirects clients to /api/giu/auth/register/merchant */
export async function POST(request: Request) {
  return NextResponse.json(
    {
      error: "Vui lòng đăng ký qua form mới (email + mật khẩu) tại /cua-hang",
    },
    { status: 410 },
  );
}
