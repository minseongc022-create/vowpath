import { NextResponse } from "next/server";
import { loadProductImage } from "@/giu/lib/product-image-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const image = await loadProductImage(id);
  if (!image) {
    return NextResponse.json({ error: "사진을 찾을 수 없어요" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
