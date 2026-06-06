import sharp from "sharp";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const logoPng = path.join(publicDir, "logo-mark.png");

const ASSET_CANDIDATES = [
  path.join(
    process.env.USERPROFILE ?? "",
    ".cursor",
    "projects",
    "c-Users-Documents",
    "assets",
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_071dc04d-c12c-4071-89d0-01e02eb8a1a3-dd704645-d913-42db-b99b-df7e14bf9d3b.png",
  ),
  path.join(
    process.env.USERPROFILE ?? "",
    ".cursor",
    "projects",
    "c-Users-Documents",
    "assets",
    "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_071dc04d-c12c-4071-89d0-01e02eb8a1a3-e9a14fb2-82ea-4b5d-a8a2-0271c2ff6aac.png",
  ),
];

function resolveSource() {
  for (const candidate of ASSET_CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  if (existsSync(logoPng)) return logoPng;
  throw new Error("logo source not found");
}

/** Remove baked-in black/dark matte backgrounds from raster marks. */
async function toTransparentPng(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : (max - min) / max;

    if (lum < 18 || max < 20) {
      data[i + 3] = 0;
      continue;
    }

    if (sat < 0.12 && lum < 140) {
      data[i + 3] = 0;
      continue;
    }

    if (sat < 0.2 && lum < 95) {
      data[i + 3] = 0;
    }
  }

  const tmp = path.join(publicDir, "logo-mark.tmp.png");
  await sharp(data, { raw: info }).png().toFile(tmp);
  const { renameSync } = await import("fs");
  renameSync(tmp, logoPng);
  return logoPng;
}

async function buildFavicon(size, logoPath) {
  const pad = Math.max(3, Math.round(size * 0.15));
  const inner = size - pad * 2;
  const rx = Math.round(size * 0.22);

  const bgSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${rx}" fill="#152238"/>
      <rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${rx - 1}" stroke="#4B5E82" stroke-width="2" stroke-opacity="0.5"/>
    </svg>`,
  );

  const logo = await sharp(logoPath)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp(bgSvg)
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer();
}

async function main() {
  const source = resolveSource();
  const hasAlphaAlready = source !== logoPng;

  if (hasAlphaAlready) {
    await sharp(source).png().toFile(logoPng);
  } else {
    await toTransparentPng(source);
  }

  for (const size of [16, 32, 180]) {
    const buf = await buildFavicon(size, logoPng);
    const out =
      size === 180
        ? path.join(publicDir, "apple-touch-icon.png")
        : path.join(publicDir, `favicon-${size}.png`);
    await sharp(buf).toFile(out);
  }

  await sharp(path.join(publicDir, "favicon-32.png")).toFile(path.join(publicDir, "favicon.ico"));
  console.log("Logo + favicons ready from", source);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
