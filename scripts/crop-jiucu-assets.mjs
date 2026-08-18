#!/usr/bin/env node
/** Re-crop Jiucu pose PNGs from public/giu/jiucu/character-sheet.png */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/giu/jiucu");
const src = path.join(out, "character-sheet.png");

const crops = {
  default: { left: 480, top: 70, width: 520, height: 420 },
  excited: { left: 30, top: 560, width: 230, height: 240 },
  curious: { left: 540, top: 560, width: 230, height: 240 },
  search: { left: 30, top: 880, width: 240, height: 300 },
  shop: { left: 270, top: 880, width: 240, height: 300 },
  enjoy: { left: 520, top: 880, width: 240, height: 300 },
};

for (const [name, region] of Object.entries(crops)) {
  await sharp(src).extract(region).png().toFile(path.join(out, `${name}.png`));
  console.log("wrote", name);
}
