/**
 * 채비 앱 아이콘 생성 — public/chaebi/icon.svg 하나에서 PWA/iOS 아이콘을 굽는다.
 *
 * 아이콘을 손으로 여러 장 관리하면 브랜드가 갈라진다. 원본은 SVG 한 장뿐이고
 * 나머지는 전부 여기서 파생된다.  실행: npm run chaebi:icons
 */
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";

const OUT = "public/chaebi";
const svg = await readFile(`${OUT}/icon.svg`);
await mkdir(OUT, { recursive: true });

for (const size of [192, 512]) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(`${OUT}/icon-${size}.png`);
}
await sharp(svg, { density: 400 }).resize(180, 180).png().toFile(`${OUT}/apple-touch-icon.png`);

// maskable — 안드로이드가 아이콘을 원형으로 깎아도 마크가 안 잘리게
// 안전 영역(80%) 안으로 줄이고 남는 자리는 브랜드색으로 채운다.
const inner = await sharp(svg, { density: 400 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#4A2840" } })
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toFile(`${OUT}/icon-512-maskable.png`);

console.log("채비 아이콘 생성 완료 →", OUT);
