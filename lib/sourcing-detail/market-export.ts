import sharp from "sharp";
import {
  MARKET_SPECS,
  type MarketPlatform,
  type MarketImageSpec,
} from "../matchcut/constants";

export type ExportImageInput = {
  name: string;
  base64?: string;
  url?: string;
};

export type ExportedFile = {
  filename: string;
  platform: "coupang" | "smartstore";
  specId: string;
  specLabel: string;
  width: number;
  height: number;
  base64: string;
  mime: string;
  bytes: number;
};

async function loadImageBuffer(input: ExportImageInput): Promise<Buffer> {
  if (input.base64) {
    const raw = input.base64.replace(/^data:[^;]+;base64,/, "");
    return Buffer.from(raw, "base64");
  }
  if (input.url) {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "MatchCut/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`FETCH_IMAGE_${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("IMAGE_SOURCE_MISSING");
}

async function resizeToSpec(
  input: Buffer,
  spec: MarketImageSpec,
  sourceName: string,
  platform: "coupang" | "smartstore",
): Promise<ExportedFile> {
  let pipeline = sharp(input)
    .rotate()
    .resize(spec.width, spec.height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });

  let out: Buffer;
  let mime: string;
  if (spec.format === "jpeg") {
    out = await pipeline.jpeg({ quality: spec.quality, mozjpeg: true }).toBuffer();
    mime = "image/jpeg";
  } else {
    out = await pipeline.png().toBuffer();
    mime = "image/png";
  }

  // Re-compress if over maxBytes
  let quality = spec.quality;
  while (out.length > spec.maxBytes && quality > 50) {
    quality -= 8;
    out = await sharp(input)
      .rotate()
      .resize(spec.width, spec.height, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  const safeName = sourceName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_").slice(0, 40);
  const ext = spec.format === "jpeg" ? "jpg" : "png";

  return {
    filename: `${platform}_${spec.id}_${safeName}.${ext}`,
    platform,
    specId: spec.id,
    specLabel: spec.label,
    width: spec.width,
    height: spec.height,
    base64: out.toString("base64"),
    mime,
    bytes: out.length,
  };
}

export async function exportImagesForMarkets(params: {
  images: ExportImageInput[];
  platform: MarketPlatform;
}): Promise<ExportedFile[]> {
  const platforms: ("coupang" | "smartstore")[] =
    params.platform === "both" ? ["coupang", "smartstore"] : [params.platform];

  const results: ExportedFile[] = [];

  for (let i = 0; i < params.images.length; i++) {
    const img = params.images[i];
    const buf = await loadImageBuffer(img);
    const name = img.name || `image-${i + 1}`;

    for (const platform of platforms) {
      const specs = MARKET_SPECS[platform];
      // First image → main spec, rest → detail spec
      const spec = i === 0 ? specs[0] : specs[1] ?? specs[0];
      const file = await resizeToSpec(buf, spec, `${name}-${i + 1}`, platform);
      results.push(file);
    }
  }

  return results;
}
