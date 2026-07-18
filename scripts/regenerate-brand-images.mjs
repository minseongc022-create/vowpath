/**
 * Regenerate schema + OG images from official horizontal/icon logos.
 * Run: node scripts/regenerate-brand-images.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const publicDir = join(process.cwd(), "public");
const bg = { r: 250, g: 248, b: 245, alpha: 1 };

async function main() {
  const iconPath = join(publicDir, "logo-icon.png");
  const horizontalPath = join(publicDir, "logo-horizontal.png");

  await sharp(iconPath)
    .resize(360, 360, { fit: "contain", background: bg })
    .extend({ top: 76, bottom: 76, left: 76, right: 76, background: bg })
    .png()
    .toFile(join(publicDir, "logo-schema.png"));

  const horizontalMeta = await sharp(horizontalPath).metadata();
  const targetW = 920;
  const resizedH = Math.round(
    ((horizontalMeta.height ?? 172) / (horizontalMeta.width ?? 720)) * targetW,
  );

  const logo = await sharp(horizontalPath)
    .resize(targetW, resizedH, { fit: "inside", background: bg })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: bg,
    },
  })
    .composite([
      { input: logo, gravity: "north", top: 72, left: 0 },
      {
        input: Buffer.from(`
          <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <text x="600" y="340" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#2f261f">
              Never lose a 2 AM emergency job to voicemail
            </text>
            <text x="600" y="390" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#57534e">
              AI intake · crew dispatch · restoration &amp; HVAC
            </text>
          </svg>
        `),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(join(publicDir, "og-image.png"));

  console.log("[brand-images] wrote logo-schema.png and og-image.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
