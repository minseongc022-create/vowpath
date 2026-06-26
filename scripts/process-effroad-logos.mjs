/**
 * Export /public brand PNGs — background-matched variants for each surface.
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

/** --vow-beige-light / marketing pages */
const SITE_BG = { r: 250, g: 248, b: 245 };
/** tailwind brand-100 — footer */
const FOOTER_BG = { r: 245, g: 240, b: 232 };
/** header glass */
const HEADER_BG = { r: 255, g: 255, b: 255 };

const SOURCES = {
  horizontal: "effiroad-logo-horizontal.png",
  medallion: "effiroad-logo-medallion.png",
  appIcon: "effiroad-logo-app-icon.png",
};

const ASSET_FILES = [
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_638c2e18-f267-4f10-baab-16513e0df975-e15da7a0-f84c-4829-b8bf-9ff0ab6e0a20-d8702036-34c0-4020-8cbe-5db6e1e6563a.png",
    SOURCES.horizontal,
  ],
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_2b7e34f5-ebde-49a5-85f0-e73b782a10ac-12d766ab-893c-4a14-b5b5-ab0c13bf11e9-3cbd6d40-275a-4e59-babb-0961b469e7ac.png",
    SOURCES.medallion,
  ],
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_f77e267f-32c0-4469-a716-d383cfbe85dc-9c9d7ab1-d733-48bb-a888-20135eb8fe59-d1b07477-7e64-4181-ac28-7622316fd570.png",
    SOURCES.appIcon,
  ],
];

function isPaperPixel(r, g, b) {
  return r > 208 && g > 203 && b > 193 && Math.max(r, g, b) - Math.min(r, g, b) < 42;
}

function isBlackPixel(r, g, b) {
  return r < 32 && g < 32 && b < 32;
}

function isFringePixel(r, g, b) {
  return r > 242 && g > 242 && b > 242;
}

async function copyUserSources() {
  const assetsRoot = path.join(
    os.homedir(),
    ".cursor",
    "projects",
    "c-Users-Documents",
    "assets",
  );
  mkdirSync(sourcesDir, { recursive: true });
  for (const [assetName, destName] of ASSET_FILES) {
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

async function mapPixels(inputPath, { clear, flatten } = {}) {
  const { data, info } = await sharp(inputPath)
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

    if (clear?.(r, g, b)) {
      pixels[i + 3] = 0;
      continue;
    }

    if (flatten && (isPaperPixel(r, g, b) || isFringePixel(r, g, b))) {
      pixels[i] = flatten.r;
      pixels[i + 1] = flatten.g;
      pixels[i + 2] = flatten.b;
      pixels[i + 3] = 255;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).trim({ threshold: 10 });
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
  const medallionSrc = path.join(sourcesDir, SOURCES.medallion);
  const appIconSrc = path.join(sourcesDir, SOURCES.appIcon);

  const horizontalLight = await mapPixels(horizontalSrc, {
    clear: (r, g, b) => isFringePixel(r, g, b) || isPaperPixel(r, g, b),
  });
  const horizontalHeader = await mapPixels(horizontalSrc, {
    clear: (r, g, b) => isFringePixel(r, g, b) || isPaperPixel(r, g, b),
    flatten: HEADER_BG,
  });
  const horizontalFooter = await mapPixels(horizontalSrc, {
    clear: (r, g, b) => isFringePixel(r, g, b) || isPaperPixel(r, g, b),
    flatten: FOOTER_BG,
  });

  const iconLight = await mapPixels(medallionSrc, { clear: isBlackPixel });
  const iconFooter = await mapPixels(appIconSrc, { flatten: FOOTER_BG });
  const iconHeader = await mapPixels(appIconSrc, { flatten: HEADER_BG });
  const iconSite = await mapPixels(appIconSrc, { flatten: SITE_BG });

  const faviconBase = await sharp(appIconSrc)
    .ensureAlpha()
    .flatten({ background: { ...HEADER_BG, alpha: 1 } })
    .trim({ threshold: 12 });

  await writePng(horizontalLight, path.join(publicDir, "logo-horizontal-light.png"), 880);
  await writePng(horizontalHeader, path.join(publicDir, "logo-horizontal.png"), 880);
  await writePng(horizontalFooter, path.join(publicDir, "logo-horizontal-footer.png"), 880);
  await writePng(iconLight, path.join(publicDir, "logo-icon-light.png"), 512);
  await writePng(iconFooter, path.join(publicDir, "logo-icon.png"), 512);
  await writePng(iconHeader, path.join(publicDir, "logo-icon-header.png"), 512);
  await writePng(iconSite, path.join(publicDir, "logo-icon-site.png"), 512);
  await writePng(iconLight, path.join(publicDir, "logo-mark.png"), 512);
  await writePng(iconLight, path.join(publicDir, "logo.png"), 512);

  for (const size of [32, 16]) {
    await faviconBase
      .clone()
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(path.join(publicDir, `favicon-${size}.png`));
    console.log(`wrote public/favicon-${size}.png`);
  }

  await faviconBase
    .clone()
    .resize(32, 32, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toFile(path.join(publicDir, "favicon.ico"));
  console.log("wrote public/favicon.ico");

  await faviconBase
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
