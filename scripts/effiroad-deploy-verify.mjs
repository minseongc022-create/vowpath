/**
 * Verify effiroad.com production includes latest toss-shop / Jarvis routes.
 * Usage: node scripts/effiroad-deploy-verify.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "https://effiroad.com").replace(/\/$/, "");

async function check(url, expectStatus) {
  const res = await fetch(url, { redirect: "follow" });
  const ok = expectStatus.includes(res.status);
  console.log(`${ok ? "✓" : "✗"} ${url} → ${res.status} (expected ${expectStatus.join("|")})`);
  return ok;
}

async function main() {
  console.log(`\n=== Effiroad deploy verify (${base}) ===\n`);

  const checks = await Promise.all([
    check(`${base}/toss-shop/login`, [200]),
    check(`${base}/api/toss-shop/market/deep-analysis?keyword=test`, [401, 403]),
    check(`${base}/api/toss-shop/jarvis/health`, [401, 403]),
  ]);

  const ok = checks.every(Boolean);
  console.log(`\n${ok ? "✓ Effiroad production verified" : "✗ Effiroad verification FAILED"}\n`);
  process.exit(ok ? 0 : 1);
}

main();
