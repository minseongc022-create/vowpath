/**
 * Regenerate /public brand PNGs + favicons from public/logo-source.png
 * Usage: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "logo-source.png");

if (!existsSync(src)) {
  console.error("Missing public/logo-source.png");
  process.exit(1);
}

const outputs = [
  ["public/logo.png", 1024],
  ["public/logo-wordmark.png", 800],
  ["public/logo-mark.png", 512],
  ["public/logo-mark-transparent.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/favicon-32.png", 32],
  ["public/favicon-16.png", 16],
];

for (const [rel, size] of outputs) {
  const out = path.join(root, rel);
  await sharp(src).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
  console.log(`wrote ${rel} (${size}px)`);
}

await sharp(src).resize(32, 32).toFormat("png").toFile(path.join(root, "public", "favicon.ico"));
console.log("wrote public/favicon.ico");
