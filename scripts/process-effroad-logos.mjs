/**
 * Crop Gemini watermark, normalize cream background, export web logo assets.
 * Usage: node scripts/process-effroad-logos.mjs
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const sourcesDir = path.join(root, "public", "brand-sources");

/** Match site --vow-beige-light */
const SITE_BG = { r: 250, g: 248, b: 245 };

const SOURCES = {
  horizontal: "effiroad-logo-horizontal.png",
  icon: "effiroad-logo-icon.png",
  favicon: "effiroad-logo-favicon.png",
};

function isPaperPixel(r, g, b) {
  return r > 210 && g > 205 && b > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 35;
}

async function copyUserSources() {
  const assets = [
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_e8c161e0-7456-4e88-b748-2b06d2a52084-707af9d9-d625-4a77-9373-fce7e08e5bfa.png",
      SOURCES.horizontal,
    ],
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_2159014a-7657-4493-bb58-efe585986248-f1f09aa0-af65-481f-8e7c-0eaff105e9f3.png",
      SOURCES.icon,
    ],
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_e2d8c4d7-b20b-4a74-8025-23c6d462b3a6-c5137839-4619-4920-9be9-88d52ebd9233.png",
      SOURCES.favicon,
    ],
  ];

  const assetsRoot = path.join(
    os.homedir(),
    ".cursor",
    "projects",
    "c-Users-Documents",
    "assets",
  );
  mkdirSync(sourcesDir, { recursive: true });
  for (const [assetName, destName] of assets) {
    const from = path.join(assetsRoot, assetName);
    const to = path.join(sourcesDir, destName);
    if (!existsSync(from)) {
      console.error("Missing source:", from);
      process.exit(1);
    }
    copyFileSync(from, to);
    console.log("copied", destName);
  }
}

/** Remove bottom-right Gemini badge area, then trim cream margins. */
async function prepareLogo(inputPath, crop, { transparentBg = false } = {}) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const cropW = Math.floor(w * (1 - crop.rightFrac));
  const cropH = Math.floor(h * (1 - crop.bottomFrac));

  const img = sharp(inputPath).extract({
    left: 0,
    top: 0,
    width: cropW,
    height: cropH,
  });

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 16) continue;
    if (isPaperPixel(r, g, b)) {
      if (transparentBg) {
        pixels[i + 3] = 0;
      } else {
        pixels[i] = SITE_BG.r;
        pixels[i + 1] = SITE_BG.g;
        pixels[i + 2] = SITE_BG.b;
        pixels[i + 3] = 255;
      }
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).trim({ threshold: transparentBg ? 1 : 12 });
}

async function writePng(pipeline, outPath, width) {
  let chain = pipeline.clone();
  if (width) {
    chain = chain.resize(width, null, { fit: "inside", withoutEnlargement: false });
  }
  await chain.png({ compressionLevel: 9 }).toFile(outPath);
  console.log("wrote", path.relative(root, outPath));
}

async function main() {
  await copyUserSources();

  const horizontalSrc = path.join(sourcesDir, SOURCES.horizontal);
  const iconSrc = path.join(sourcesDir, SOURCES.icon);
  const faviconSrc = path.join(sourcesDir, SOURCES.favicon);

  const horizontal = await prepareLogo(horizontalSrc, { rightFrac: 0.1, bottomFrac: 0.14 });
  const horizontalTransparent = await prepareLogo(
    horizontalSrc,
    { rightFrac: 0.1, bottomFrac: 0.14 },
    { transparentBg: true },
  );
  const icon = await prepareLogo(iconSrc, { rightFrac: 0.12, bottomFrac: 0.14 });
  const iconTransparent = await prepareLogo(iconSrc, { rightFrac: 0.12, bottomFrac: 0.14 }, {
    transparentBg: true,
  });
  const faviconCard = await prepareLogo(faviconSrc, { rightFrac: 0.11, bottomFrac: 0.12 });

  await writePng(horizontal, path.join(publicDir, "logo-horizontal.png"), 720);
  await writePng(horizontalTransparent, path.join(publicDir, "logo-horizontal-light.png"), 720);
  await writePng(icon, path.join(publicDir, "logo-icon.png"), 512);
  await writePng(iconTransparent, path.join(publicDir, "logo-icon-light.png"), 512);
  await writePng(faviconCard, path.join(publicDir, "logo-mark.png"), 512);
  await writePng(icon, path.join(publicDir, "logo.png"), 512);

  for (const size of [32, 16]) {
    await faviconCard
      .clone()
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(path.join(publicDir, `favicon-${size}.png`));
    console.log(`wrote public/favicon-${size}.png`);
  }

  await faviconCard
    .clone()
    .resize(32, 32, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toFile(path.join(publicDir, "favicon.ico"));
  console.log("wrote public/favicon.ico");

  await faviconCard
    .clone()
    .resize(180, 180, { fit: "cover", position: "centre" })
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("wrote public/apple-touch-icon.png");

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
