/**
 * Build public/og-image.png (1200×630) for Open Graph / social previews.
 * Usage: node scripts/generate-og-image.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/og-image.png");
const logoPath = join(root, "public/logo-horizontal-light.png");

const width = 1200;
const height = 630;

const bgSvg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#faf8f5"/>
      <stop offset="55%" style="stop-color:#f3ede4"/>
      <stop offset="100%" style="stop-color:#e8dfd0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="600" y="420" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="600" fill="#44403c">
    Never lose a 2 AM emergency job to voicemail
  </text>
  <text x="600" y="472" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#78716c">
    AI intake · crew dispatch · restoration &amp; HVAC
  </text>
</svg>`;

async function main() {
  const logo = readFileSync(logoPath);
  const logoW = 520;
  const logoBuf = await sharp(logo).resize(logoW).png().toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoH = logoMeta.height ?? 120;

  await sharp(Buffer.from(bgSvg))
    .composite([
      {
        input: logoBuf,
        top: Math.round(height * 0.28 - logoH / 2),
        left: Math.round((width - logoW) / 2),
      },
    ])
    .png({ quality: 90 })
    .toFile(out);

  console.log(`Wrote ${out} (${width}×${height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
