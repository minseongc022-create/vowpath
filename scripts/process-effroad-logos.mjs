/**
 * Export /public brand PNGs — strip fake transparency, crop lockups, extract ER marks only.
 * Usage: node scripts/process-effroad-logos.mjs
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const sourcesDir = path.join(root, "public", "brand-sources");

const SITE_BG = { r: 250, g: 248, b: 245 };
const FOOTER_BG = { r: 245, g: 240, b: 232 };
const HEADER_BG = { r: 255, g: 255, b: 255 };
const FAVICON_BG = { r: 250, g: 248, b: 245 };

const SOURCES = {
  horizontal: "effiroad-logo-horizontal.png",
  medallion: "effiroad-logo-medallion.png",
  appIcon: "effiroad-logo-app-icon.png",
};

const ASSET_FILES = [
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_90455dc0-4720-494d-bc00-433c29e12898-0fa2d55d-0a67-4fc0-a4d6-faa0513be05d.png",
    SOURCES.horizontal,
  ],
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_0ec9ad7e-41a4-4410-8050-44691452fd33-efd3a58f-aa45-4f6b-84d6-b430ad092aba.png",
    SOURCES.medallion,
  ],
  [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_f77e267f-32c0-4469-a716-d383cfbe85dc-d37ff734-f18e-4342-a147-68eeb8da099b.png",
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

function isCheckerboardPixel(r, g, b) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread > 10) return false;
  if (r > 236 && g > 236 && b > 236) return true;
  if (r > 196 && g > 196 && b > 196 && r < 212 && g < 212 && b < 212) return true;
  return false;
}

function isDarkFringe(r, g, b) {
  return r < 130 && g < 90 && b < 60;
}

function isMedallionFill(r, g, b) {
  if (isPaperPixel(r, g, b)) return true;
  return r > 175 && g > 140 && b > 110 && r - b < 95;
}

function shouldClearBackground(r, g, b) {
  return (
    isCheckerboardPixel(r, g, b) ||
    isFringePixel(r, g, b) ||
    isPaperPixel(r, g, b) ||
    isBlackPixel(r, g, b) ||
    isDarkFringe(r, g, b)
  );
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

async function clearAndTrim(inputPath, clearFn) {
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
    if (clearFn(r, g, b)) pixels[i + 3] = 0;
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

/** ER icon + EFFIROAD only — strip tagline rows */
async function cropHorizontalWordmark(inputPath) {
  const buf = await clearAndTrim(inputPath, shouldClearBackground);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const rowCounts = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 20) rowCounts[y]++;
    }
  }

  let top = 0;
  for (let y = 0; y < h; y++) {
    if (rowCounts[y] > w * 0.008) {
      top = y;
      break;
    }
  }

  let peak = 0;
  let peakY = top;
  for (let y = top; y < h; y++) {
    if (rowCounts[y] > peak) {
      peak = rowCounts[y];
      peakY = y;
    }
  }

  const bandThreshold = peak * 0.35;
  let bandBottom = peakY;
  for (let y = peakY; y < h; y++) {
    if (rowCounts[y] >= bandThreshold) bandBottom = y;
  }

  let cropBottom = bandBottom + 4;
  for (let y = bandBottom + 1; y < h; y++) {
    if (rowCounts[y] < peak * 0.45) {
      cropBottom = y - 2;
      break;
    }
  }

  cropBottom = Math.min(cropBottom, top + Math.round(h * 0.48));

  const cropped = await sharp(buf)
    .extract({
      left: 0,
      top: Math.max(0, top - 2),
      width: w,
      height: Math.max(1, cropBottom - top + 4),
    })
    .trim({ threshold: 8 })
    .png()
    .toBuffer();

  return cropped;
}

async function centerCropBuffer(buf, ratio) {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const size = Math.round(Math.min(w, h) * ratio);
  const left = Math.round((w - size) / 2);
  const top = Math.round((h - size) / 2);
  return sharp(buf)
    .extract({ left, top, width: size, height: size })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

async function extractErMark(appIconPath, medallionPath) {
  const appBuf = await clearAndTrim(appIconPath, shouldClearBackground);
  const medalBuf = await clearAndTrim(medallionPath, (r, g, b) =>
    shouldClearBackground(r, g, b) || isMedallionFill(r, g, b),
  );

  const appMark = await centerCropBuffer(appBuf, 0.56);
  const medalMark = await centerCropBuffer(medalBuf, 0.46);

  const appArea = (await sharp(appMark).metadata()).width ?? 0;
  const medalArea = (await sharp(medalMark).metadata()).width ?? 0;
  return medalArea > appArea * 0.88 ? medalMark : appMark;
}

async function flattenBuffer(buf, bg) {
  return sharp(buf).flatten({ background: { ...bg, alpha: 1 } });
}

async function writePngFromBuffer(buf, outPath, width) {
  let chain = sharp(buf);
  if (width) {
    chain = chain.resize(width, null, { fit: "inside", withoutEnlargement: false });
  }
  await chain.png({ compressionLevel: 9, effort: 10 }).toFile(outPath);
  console.log("wrote", path.relative(root, outPath));
}

async function writePng(pipeline, outPath, width) {
  const buf = await pipeline.clone().png().toBuffer();
  await writePngFromBuffer(buf, outPath, width);
}

async function buildFavicon(symbolBuf, bg = FAVICON_BG) {
  const trimmed = await sharp(symbolBuf).trim({ threshold: 10 }).png().toBuffer();
  const inner = 20;
  const canvas = 32;
  const resizedBuf = await sharp(trimmed)
    .resize(inner, inner, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resizedBuf).metadata();
  const rw = resizedMeta.width ?? inner;
  const rh = resizedMeta.height ?? inner;

  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { ...bg, alpha: 1 },
    },
  }).composite([
    {
      input: resizedBuf,
      left: Math.round((canvas - rw) / 2),
      top: Math.round((canvas - rh) / 2),
    },
  ]);
}

function writeDimensions(horizontalMeta, symbolMeta) {
  const hw = horizontalMeta.width ?? 640;
  const hh = horizontalMeta.height ?? 90;
  const sw = symbolMeta.width ?? 512;
  const sh = symbolMeta.height ?? 512;
  const content = `/** Auto-generated by scripts/process-effroad-logos.mjs — do not edit */
export const BRAND_HORIZONTAL_WIDTH = ${hw};
export const BRAND_HORIZONTAL_HEIGHT = ${hh};
export const BRAND_HORIZONTAL_RATIO = ${hw} / ${hh};
export const BRAND_SYMBOL_WIDTH = ${sw};
export const BRAND_SYMBOL_HEIGHT = ${sh};
`;
  writeFileSync(path.join(root, "lib", "brand-dimensions.ts"), content);
  console.log("wrote lib/brand-dimensions.ts", `${hw}x${hh}`, `${sw}x${sh}`);
}

async function main() {
  await copyUserSources();

  const horizontalSrc = path.join(sourcesDir, SOURCES.horizontal);
  const medallionSrc = path.join(sourcesDir, SOURCES.medallion);
  const appIconSrc = path.join(sourcesDir, SOURCES.appIcon);

  const horizontalWordmarkBuf = await cropHorizontalWordmark(horizontalSrc);
  const horizontalWordmark = sharp(horizontalWordmarkBuf);
  const symbolBuf = await extractErMark(appIconSrc, medallionSrc);
  const faviconBase = await buildFavicon(symbolBuf);

  await writePngFromBuffer(horizontalWordmarkBuf, path.join(publicDir, "logo-horizontal-light.png"), 720);
  await writePngFromBuffer(
    await flattenBuffer(horizontalWordmarkBuf, HEADER_BG).then((s) => s.png().toBuffer()),
    path.join(publicDir, "logo-horizontal.png"),
    720,
  );
  await writePngFromBuffer(
    await flattenBuffer(horizontalWordmarkBuf, FOOTER_BG).then((s) => s.png().toBuffer()),
    path.join(publicDir, "logo-horizontal-footer.png"),
    720,
  );

  await writePngFromBuffer(symbolBuf, path.join(publicDir, "logo-icon-light.png"), 512);
  await writePngFromBuffer(
    await flattenBuffer(symbolBuf, FOOTER_BG).then((s) => s.png().toBuffer()),
    path.join(publicDir, "logo-icon.png"),
    512,
  );
  await writePngFromBuffer(
    await flattenBuffer(symbolBuf, HEADER_BG).then((s) => s.png().toBuffer()),
    path.join(publicDir, "logo-icon-header.png"),
    512,
  );
  await writePngFromBuffer(
    await flattenBuffer(symbolBuf, SITE_BG).then((s) => s.png().toBuffer()),
    path.join(publicDir, "logo-icon-site.png"),
    512,
  );
  await writePngFromBuffer(symbolBuf, path.join(publicDir, "logo-mark.png"), 512);
  await writePngFromBuffer(symbolBuf, path.join(publicDir, "logo.png"), 512);

  await faviconBase.clone().png().toFile(path.join(publicDir, "favicon-32.png"));
  console.log("wrote public/favicon-32.png");

  await sharp(path.join(publicDir, "favicon-32.png"))
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, "favicon-16.png"));
  console.log("wrote public/favicon-16.png");

  await faviconBase.clone().png().toFile(path.join(publicDir, "favicon.ico"));
  console.log("wrote public/favicon.ico");

  await faviconBase
    .clone()
    .resize(180, 180, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("wrote public/apple-touch-icon.png");

  const horizontalMeta = await sharp(path.join(publicDir, "logo-horizontal-light.png")).metadata();
  const symbolMeta = await sharp(path.join(publicDir, "logo-icon-light.png")).metadata();
  writeDimensions(horizontalMeta, symbolMeta);

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
