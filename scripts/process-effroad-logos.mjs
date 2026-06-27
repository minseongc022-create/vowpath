/**
 * Export /public brand PNGs from official Effiroad sources.
 * - Horizontal lockup: ER + EFFIROAD (tagline stripped, no aggressive crop)
 * - Symbol: ER mark extracted from lockup (frameless, matches header)
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
const ASSET_VERSION = "13";

const SITE_BG = { r: 250, g: 248, b: 245 };
const FOOTER_BG = { r: 245, g: 240, b: 232 };
const HEADER_BG = { r: 255, g: 255, b: 255 };
const FAVICON_BG = { r: 250, g: 248, b: 245 };

const SOURCES = {
  horizontal: "effiroad-logo-horizontal.png",
  medallion: "effiroad-logo-medallion.png",
  appIcon: "effiroad-logo-app-icon.png",
};

/** Prefer newest chat uploads; fall back to prior asset names. */
const ASSET_CANDIDATES = {
  horizontal: [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_90455dc0-4720-494d-bc00-433c29e12898-b7b546f9-8a1b-4c92-9068-f7901cc974ce.png",
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_90455dc0-4720-494d-bc00-433c29e12898-0fa2d55d-0a67-4fc0-a4d6-faa0513be05d.png",
  ],
  medallion: [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_0ec9ad7e-41a4-4410-8050-44691452fd33-cf5d42f2-2624-4651-a2a9-dfc13eafcd26.png",
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_0ec9ad7e-41a4-4410-8050-44691452fd33-efd3a58f-aa45-4f6b-84d6-b430ad092aba.png",
  ],
  appIcon: [
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_f77e267f-32c0-4469-a716-d383cfbe85dc-929a303f-288b-49ea-adde-66cfb7eda14a.png",
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_f77e267f-32c0-4469-a716-d383cfbe85dc-d37ff734-f18e-4342-a147-68eeb8da099b.png",
  ],
};

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

function shouldClearHorizontalBackground(r, g, b) {
  return (
    isCheckerboardPixel(r, g, b) ||
    isFringePixel(r, g, b) ||
    isPaperPixel(r, g, b)
  );
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

function assetsRoot() {
  return path.join(os.homedir(), ".cursor", "projects", "c-Users-Documents", "assets");
}

async function copyUserSources() {
  mkdirSync(sourcesDir, { recursive: true });
  const rootAssets = assetsRoot();

  for (const [key, destName] of Object.entries(SOURCES)) {
    const candidates = ASSET_CANDIDATES[key];
    const existing = path.join(sourcesDir, destName);
    let copied = false;

    for (const assetName of candidates) {
      const from = path.join(rootAssets, assetName);
      if (!existsSync(from)) continue;
      copyFileSync(from, existing);
      console.log("copied", destName, "←", assetName.slice(-40));
      copied = true;
      break;
    }

    if (!copied && existsSync(existing)) {
      console.log("keep existing", destName);
      continue;
    }

    if (!copied) {
      console.error("Missing source for", destName, "— add PNG to", sourcesDir);
      process.exit(1);
    }
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

function analyzeRows(data, width, height) {
  const rowMaxX = new Array(height).fill(0);
  const rowMinX = new Array(height).fill(width);
  const rowHas = new Array(height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 20) {
        rowHas[y] = true;
        rowMaxX[y] = Math.max(rowMaxX[y], x);
        rowMinX[y] = Math.min(rowMinX[y], x);
      }
    }
  }

  return { rowMaxX, rowMinX, rowHas };
}

/** Keep full ER + EFFIROAD lockup; zero-out tagline rows below the wordmark. */
async function prepareHorizontalLockup(inputPath) {
  const trimmed = await clearAndTrim(inputPath, shouldClearHorizontalBackground);
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);
  const { width: w, height: h } = info;
  const { rowMaxX } = analyzeRows(pixels, w, h);

  const wordmarkThreshold = Math.round(w * 0.82);
  let lastWordmarkRow = -1;
  for (let y = 0; y < h; y++) {
    if (rowMaxX[y] >= wordmarkThreshold) lastWordmarkRow = y;
  }

  if (lastWordmarkRow >= 0 && lastWordmarkRow < h - 1) {
    for (let y = lastWordmarkRow + 1; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        pixels[i + 3] = 0;
      }
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: w, height: h, channels: 4 },
  })
    .trim({ threshold: 8 })
    .extend({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .trim({ threshold: 8 })
    .png()
    .toBuffer();
}

/** Frameless ER mark — top band of lockup (before full-width wordmark rows). */
async function extractSymbolFromLockup(horizontalBuf) {
  const { data, info } = await sharp(horizontalBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const { rowMaxX, rowHas } = analyzeRows(data, w, h);

  const symbolBandMaxX = Math.round(w * 0.72);
  let top = h;
  let bottom = 0;
  let right = 0;

  for (let y = 0; y < h; y++) {
    if (!rowHas[y]) continue;
    if (rowMaxX[y] > symbolBandMaxX) continue;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    right = Math.max(right, rowMaxX[y]);
  }

  if (top > bottom || right < 16) return null;

  const cropTop = Math.max(0, top - 12);
  const cropHeight = Math.min(h - cropTop, bottom - top + 24);
  const cropWidth = Math.min(w, right + 10);
  if (cropWidth < 16 || cropHeight < 16) return null;

  try {
    const cropped = await sharp(horizontalBuf)
      .extract({ left: 0, top: cropTop, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer();

    const symbolBuf = await sharp(cropped)
      .trim({ threshold: 8 })
      .extend({
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .trim({ threshold: 8 })
      .png()
      .toBuffer();

    const out = await sharp(symbolBuf).metadata();
    if ((out.width ?? 0) > 32 && (out.height ?? 0) > 32) return symbolBuf;
  } catch {
    return null;
  }

  return null;
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

async function extractErMarkFallback(appIconPath, medallionPath) {
  const appBuf = await clearAndTrim(appIconPath, shouldClearBackground);
  const medalBuf = await clearAndTrim(medallionPath, (r, g, b) =>
    shouldClearBackground(r, g, b) || isMedallionFill(r, g, b),
  );

  const appMark = await centerCropBuffer(appBuf, 0.62);
  const medalMark = await centerCropBuffer(medalBuf, 0.52);

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

async function buildFavicon(symbolBuf, bg = FAVICON_BG) {
  const trimmed = await sharp(symbolBuf).trim({ threshold: 10 }).png().toBuffer();
  const inner = 22;
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

function writeBrandAssetsModule() {
  const v = ASSET_VERSION;
  const content = `/** Official Effiroad assets in /public (generated by scripts/process-effroad-logos.mjs) */
export const BRAND_ASSET_VERSION = "${v}";

export const BRAND_LOGO_HORIZONTAL_SRC = "/logo-horizontal-light.png?v=${v}";
export const BRAND_LOGO_ICON_SRC = "/logo-icon-light.png?v=${v}";
export const BRAND_LOGO_HORIZONTAL_SOLID_SRC = "/logo-horizontal.png?v=${v}";
export const BRAND_LOGO_HORIZONTAL_FOOTER_SRC = "/logo-horizontal-footer.png?v=${v}";
export const BRAND_LOGO_ICON_SOLID_SRC = "/logo-icon.png?v=${v}";
export const BRAND_LOGO_ICON_HEADER_SRC = "/logo-icon-header.png?v=${v}";
export const BRAND_LOGO_ICON_SITE_SRC = "/logo-icon-site.png?v=${v}";
export const BRAND_MARK_SRC = "/logo-mark.png?v=${v}";
/** @deprecated Use BRAND_LOGO_ICON_SRC */
export const BRAND_LOGO_SRC = BRAND_LOGO_ICON_SRC;
/** @deprecated Wordmark is included in horizontal lockup */
export const BRAND_WORDMARK_SRC = BRAND_LOGO_HORIZONTAL_SRC;

export type BrandLogoSurface = "default" | "header" | "footer" | "dark";

export function pickBrandIconSrc(surface: BrandLogoSurface = "default") {
  if (surface === "footer") return BRAND_LOGO_ICON_SOLID_SRC;
  if (surface === "header") return BRAND_LOGO_ICON_HEADER_SRC;
  if (surface === "dark") return BRAND_LOGO_ICON_SRC;
  return BRAND_LOGO_ICON_SRC;
}

export function pickBrandHorizontalSrc(surface: BrandLogoSurface = "default") {
  if (surface === "footer") return BRAND_LOGO_HORIZONTAL_FOOTER_SRC;
  if (surface === "header") return BRAND_LOGO_HORIZONTAL_SOLID_SRC;
  return BRAND_LOGO_HORIZONTAL_SRC;
}
`;
  writeFileSync(path.join(root, "lib", "brand-assets.ts"), content);
  console.log("wrote lib/brand-assets.ts v" + v);
}

async function main() {
  await copyUserSources();

  const horizontalSrc = path.join(sourcesDir, SOURCES.horizontal);
  const medallionSrc = path.join(sourcesDir, SOURCES.medallion);
  const appIconSrc = path.join(sourcesDir, SOURCES.appIcon);

  const horizontalWordmarkBuf = await prepareHorizontalLockup(horizontalSrc);
  let symbolBuf = await extractSymbolFromLockup(horizontalWordmarkBuf);
  if (!symbolBuf) {
    console.log("symbol: fallback to medallion/app icon extraction");
    symbolBuf = await extractErMarkFallback(appIconSrc, medallionSrc);
  } else {
    console.log("symbol: extracted from horizontal lockup");
  }

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
  writeBrandAssetsModule();

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
