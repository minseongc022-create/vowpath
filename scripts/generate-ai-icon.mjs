/**
 * Build the canonical circular Effiroad AI icon from the reference source art.
 * Output: public/effiroad-ai-icon.png (512×512, transparent outside circle)
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public/brand-sources/effiroad-ai-chat-mark-source.png");
const out = join(root, "public/effiroad-ai-icon.png");
const size = 512;

const circle = Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
);

const buf = await sharp(src)
  .resize(size, size, { fit: "cover", position: "centre" })
  .composite([{ input: circle, blend: "dest-in" }])
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(out, buf);
console.log(`[generate-ai-icon] wrote ${out} (${buf.length} bytes)`);
