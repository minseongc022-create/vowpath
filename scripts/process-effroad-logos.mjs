/**
 * Export /public brand PNGs from latest Effiroad logo sources.
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
const SITE_BG = { r: 250, g: 248, b: 245, alpha: 1 };

const SOURCES = {
  horizontal: "effiroad-logo-horizontal.png",
  medallion: "effiroad-logo-medallion.png",
  appIcon: "effiroad-logo-app-icon.png",
};

function isPaperPixel(r, g, b) {
  return r > 210 && g > 205 && b > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
}

function isBlackPixel(r, g, b) {
  return r < 28 && g < 28 && b < 28;
}

async function copyUserSources() {
  const assets = [
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_638c2e18-f267-4f10-baab-16513e0df975-e15da7a0-f84c-4829-b8bf-9ff0ab6e0a20.png",
      SOURCES.horizontal,
    ],
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_2b7e34f5-ebde-49a5-85f0-e73b782a10ac-12d766ab-893c-4a14-b5b5-ab0c13bf11e9.png",
      SOURCES.medallion,
    ],
    [
      "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_f77e267f-32c0-4469-a716-d383cfbe85dc-9c9d7ab1-d733-48bb-a888-20135eb8fe59.png",
      SOURCES.appIcon,
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

async function mapPixels(inputPath, shouldClear, { flattenPaper = false } = {}) {
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
    if (shouldClear(r, g, b)) {
      pixels[i + 3] = 0;
      continue;
    }
    if (flattenPaper && isPaperPixel(r, g, b)) {
      pixels[i] = SITE_BG.r;
      pixels[i + 1] = SITE_BG.g;
      pixels[i + 2] = SITE_BG.b;
      pixels[i + 3] = 255;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).trim({ threshold: 8 });
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

  const horizontalLight = await mapPixels(horizontalSrc, () => false);
  const horizontalSolid = await mapPixels(horizontalSrc, () => false, { flattenPaper: true });

  const iconLight = await mapPixels(medallionSrc, isBlackPixel);
  const iconSolid = await sharp(appIconSrc)
    .ensureAlpha()
    .flatten({ background: SITE_BG })
    .trim({ threshold: 12 });

  const faviconSource = await sharp(appIconSrc).ensureAlpha().trim({ threshold: 12 });

  await writePng(horizontalLight, path.join(publicDir, "logo-horizontal-light.png"), 880);
  await writePng(horizontalSolid, path.join(publicDir, "logo-horizontal.png"), 880);
  await writePng(iconLight, path.join(publicDir, "logo-icon-light.png"), 512);
  await writePng(iconSolid, path.join(publicDir, "logo-icon.png"), 512);
  await writePng(iconLight, path.join(publicDir, "logo-mark.png"), 512);
  await writePng(iconLight, path.join(publicDir, "logo.png"), 512);

  for (const size of [32, 16]) {
    await faviconSource
      .clone()
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(path.join(publicDir, `favicon-${size}.png`));
    console.log(`wrote public/favicon-${size}.png`);
  }

  await faviconSource
    .clone()
    .resize(32, 32, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toFile(path.join(publicDir, "favicon.ico"));
  console.log("wrote public/favicon.ico");

  await faviconSource
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
