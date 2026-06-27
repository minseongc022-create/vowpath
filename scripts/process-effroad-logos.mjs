/**
 * Export /public brand PNGs — strip fake transparency, crop lockups, extract ER marks only.
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

const SITE_BG = { r: 250, g: 248, b: 245 };
const FOOTER_BG = { r: 245, g: 240, b: 232 };
const HEADER_BG = { r: 255, g: 255, b: 255 };
/** Chrome light-tab backing — avoids transparent halo in favicon */
const FAVICON_BG = { r: 237, g: 237, b: 237 };

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

function shouldClearBackground(r, g, b) {
  return (
    isCheckerboardPixel(r, g, b) ||
    isFringePixel(r, g, b) ||
    isPaperPixel(r, g, b) ||
    isBlackPixel(r, g, b)
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
    .trim({ threshold: 8 })
    .png()
    .toBuffer();
}

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
    if (rowCounts[y] > w * 0.01) {
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

  const gapThreshold = peak * 0.18;
  let cropBottom = h - 1;
  for (let y = peakY + 12; y < h; y++) {
    if (rowCounts[y] < gapThreshold) {
      cropBottom = y - 8;
      break;
    }
  }

  cropBottom = Math.min(cropBottom, top + Math.round(h * 0.72));

  return sharp(buf).extract({
    left: 0,
    top: Math.max(0, top - 2),
    width: w,
    height: Math.max(1, cropBottom - top + 4),
  });
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
    .trim({ threshold: 8 })
    .png()
    .toBuffer();
}

/** ER letters + road only — no square/circle frames */
async function extractErMark(appIconPath, medallionPath) {
  const appBuf = await clearAndTrim(appIconPath, shouldClearBackground);
  const medalBuf = await clearAndTrim(medallionPath, shouldClearBackground);

  const appMark = await centerCropBuffer(appBuf, 0.58);
  const medalMark = await centerCropBuffer(medalBuf, 0.48);

  const appArea = (await sharp(appMark).metadata()).width ?? 0;
  const medalArea = (await sharp(medalMark).metadata()).width ?? 0;
  const picked = medalArea > appArea * 0.9 ? medalMark : appMark;
  return sharp(picked);
}

async function flattenPipeline(pipeline, bg) {
  return pipeline.flatten({ background: { ...bg, alpha: 1 } });
}

async function writePng(pipeline, outPath, width) {
  let chain = pipeline.clone();
  if (width) {
    chain = chain.resize(width, null, { fit: "inside", withoutEnlargement: false });
  }
  await chain.png({ compressionLevel: 9, effort: 10 }).toFile(outPath);
  console.log("wrote", path.relative(root, outPath));
}

async function buildFavicon(erMarkPipeline, bg = FAVICON_BG) {
  const trimmedBuf = await erMarkPipeline.clone().trim({ threshold: 8 }).png().toBuffer();
  const inner = 26;
  const canvas = 32;
  const resizedBuf = await sharp(trimmedBuf)
    .resize(inner, inner, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
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

async function main() {
  await copyUserSources();

  const horizontalSrc = path.join(sourcesDir, SOURCES.horizontal);
  const medallionSrc = path.join(sourcesDir, SOURCES.medallion);
  const appIconSrc = path.join(sourcesDir, SOURCES.appIcon);

  const horizontalWordmark = await cropHorizontalWordmark(horizontalSrc);
  const erMark = await extractErMark(appIconSrc, medallionSrc);
  const faviconBase = await buildFavicon(erMark);

  await writePng(horizontalWordmark, path.join(publicDir, "logo-horizontal-light.png"), 640);
  await writePng(
    await flattenPipeline(horizontalWordmark, HEADER_BG),
    path.join(publicDir, "logo-horizontal.png"),
    640,
  );
  await writePng(
    await flattenPipeline(horizontalWordmark, FOOTER_BG),
    path.join(publicDir, "logo-horizontal-footer.png"),
    640,
  );

  await writePng(erMark, path.join(publicDir, "logo-icon-light.png"), 512);
  await writePng(await flattenPipeline(erMark, FOOTER_BG), path.join(publicDir, "logo-icon.png"), 512);
  await writePng(await flattenPipeline(erMark, HEADER_BG), path.join(publicDir, "logo-icon-header.png"), 512);
  await writePng(await flattenPipeline(erMark, SITE_BG), path.join(publicDir, "logo-icon-site.png"), 512);
  await writePng(erMark, path.join(publicDir, "logo-mark.png"), 512);
  await writePng(erMark, path.join(publicDir, "logo.png"), 512);

  await faviconBase
    .clone()
    .resize(32, 32, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, "favicon-32.png"));
  console.log("wrote public/favicon-32.png");

  await sharp(path.join(publicDir, "favicon-32.png"))
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, "favicon-16.png"));
  console.log("wrote public/favicon-16.png");

  await faviconBase
    .clone()
    .resize(32, 32, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .toFormat("png")
    .toFile(path.join(publicDir, "favicon.ico"));
  console.log("wrote public/favicon.ico");

  await faviconBase
    .clone()
    .resize(180, 180, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("wrote public/apple-touch-icon.png");

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
