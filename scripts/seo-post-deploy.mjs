/**
 * Ping search engines + verify canonical redirects after deploy.
 * Usage: node scripts/seo-post-deploy.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "https://effiroad.com").replace(/\/$/, "");
const sitemap = `${base}/sitemap.xml`;

const REDIRECT_CHECKS = [
  ["https://www.effiroad.com/", "https://effiroad.com/"],
  ["https://vowroad.com/", "https://effiroad.com/"],
  ["https://www.vowroad.com/", "https://effiroad.com/"],
  ["https://link.vowroad.com/r/test", "https://link.effiroad.com/r/test"],
];

async function ping(url, label) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    console.log(`${label}: HTTP ${res.status}`);
    return res.ok || res.status === 200;
  } catch (e) {
    console.log(`${label}: failed — ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

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
      console.log("    ↳ Domain may not be attached to Vercel project yet (run vercel-link-domains.mjs)");
    }
    return ok;
  } catch (e) {
    console.log(`✗ ${from} — ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  console.log("\n=== SEO post-deploy ===\n");

  console.log("--- Sitemap ping ---");
  await ping(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`, "Google ping");
  await ping(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`, "Bing ping");

  console.log("\n--- Redirect checks ---");
  let passed = 0;
  for (const [from, to] of REDIRECT_CHECKS) {
    if (await checkRedirect(from, to)) passed++;
  }

  console.log(`\n${passed}/${REDIRECT_CHECKS.length} redirects OK`);
  console.log(
    "\nGoogle Search Console (manual): https://search.google.com/search-console",
  );
  console.log(`  → URL inspection → ${base} → Request indexing\n`);

  if (passed < REDIRECT_CHECKS.length) {
    process.exit(1);
  }
}

main();
