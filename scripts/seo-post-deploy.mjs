/**
 * Ping search engines + verify canonical redirects after deploy.
 * Usage: node scripts/seo-post-deploy.mjs [baseUrl]
 */
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] ?? "https://effiroad.com").replace(/\/$/, "");

const REQUIRED_REDIRECTS = [["https://www.effiroad.com/", "https://effiroad.com/"]];

const OPTIONAL_REDIRECTS = [
  ["https://vowroad.com/", "https://effiroad.com/"],
  ["https://www.vowroad.com/", "https://effiroad.com/"],
  ["https://link.vowroad.com/r/test", "https://link.effiroad.com/r/test"],
];

async function checkRedirect(from, expectedPrefix) {
  try {
    const res = await fetch(from, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const ok =
      res.status >= 301 &&
      res.status <= 308 &&
      loc.replace(/\/$/, "").startsWith(expectedPrefix.replace(/\/$/, ""));
    console.log(`${ok ? "✓" : "✗"} ${from} → ${res.status} ${loc || "(no location)"}`);
    if (!ok && res.status === 404) {
      console.log("    ↳ Attach domain in Vercel or run: npm run porkbun:forward");
    }
    return ok;
  } catch (e) {
    console.log(`✗ ${from} — ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  console.log("\n=== SEO post-deploy ===\n");

  console.log("--- IndexNow ---");
  const indexNow = spawnSync("node", ["scripts/indexnow-submit.mjs", base], {
    cwd: root,
    stdio: "inherit",
  });

  console.log("\n--- Required redirects ---");
  let required = 0;
  for (const [from, to] of REQUIRED_REDIRECTS) {
    if (await checkRedirect(from, to)) required++;
  }

  console.log("\n--- Legacy vowroad redirects (optional until domains linked) ---");
  let optional = 0;
  for (const [from, to] of OPTIONAL_REDIRECTS) {
    if (await checkRedirect(from, to)) optional++;
  }

  console.log(
    `\nRequired: ${required}/${REQUIRED_REDIRECTS.length} · Legacy: ${optional}/${OPTIONAL_REDIRECTS.length}`,
  );
  console.log(
    "\nGoogle Search Console: https://search.google.com/search-console → URL inspection → Request indexing\n",
  );

  if (required < REQUIRED_REDIRECTS.length || indexNow.status !== 0) {
    process.exit(1);
  }
}

main();
