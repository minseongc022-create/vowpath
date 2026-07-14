/**
 * Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver, etc.).
 * Key file must be live at https://{host}/{key}.txt before submitting.
 *
 * Usage: node scripts/indexnow-submit.mjs [baseUrl]
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "config/indexnow.json"), "utf8"));
const base = (process.argv[2] ?? `https://${config.host}`).replace(/\/$/, "");

const URLS = [
  `${base}/`,
  `${base}/pricing`,
  `${base}/hvac`,
  `${base}/privacy`,
  `${base}/terms`,
];

async function verifyKeyFile() {
  const keyUrl = `${base}/${config.key}.txt`;
  const res = await fetch(keyUrl);
  const text = (await res.text()).trim();
  if (!res.ok || text !== config.key) {
    throw new Error(`Key file not ready at ${keyUrl} (HTTP ${res.status})`);
  }
  console.log(`✓ Key file verified: ${keyUrl}`);
}

async function submitIndexNow() {
  const body = {
    host: config.host,
    key: config.key,
    keyLocation: `${base}/${config.key}.txt`,
    urlList: URLS,
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  console.log(`IndexNow API: HTTP ${res.status}${res.status === 202 ? " (accepted)" : ""}`);
  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    console.log(text.slice(0, 300));
    return false;
  }
  return true;
}

async function submitBingDirect() {
  let ok = 0;
  for (const url of URLS) {
    const endpoint = new URL("https://www.bing.com/indexnow");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("key", config.key);
    const res = await fetch(endpoint.toString());
    const pass = res.status === 200 || res.status === 202;
    console.log(`${pass ? "✓" : "·"} Bing ${url} → ${res.status}`);
    if (pass) ok++;
  }
  return ok;
}

async function main() {
  console.log("\n=== IndexNow submit ===\n");
  await verifyKeyFile();
  const apiOk = await submitIndexNow();
  console.log("");
  const bingOk = await submitBingDirect();
  console.log(`\nSubmitted ${URLS.length} URLs (${bingOk} Bing direct OK)\n`);
  if (!apiOk && bingOk === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
