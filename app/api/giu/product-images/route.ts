import { NextResponse } from "next/server";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { saveProductImage } from "@/giu/lib/product-image-store";

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant") {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "사진 파일을 선택해 주세요" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveProductImage(buffer, file.type || "image/jpeg");
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ id: result.id, url: result.url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
