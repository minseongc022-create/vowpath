#!/usr/bin/env node
/**
 * Verify production checkout readiness from the public status endpoint.
 * Usage: node scripts/verify-checkout-prod.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "https://effiroad.com").replace(/\/$/, "");

async function main() {
  const statusRes = await fetch(`${base}/api/checkout/status`);
  const status = await statusRes.json();
  console.log("\n=== Checkout status ===\n");
  console.log(JSON.stringify(status, null, 2));

  const postRes = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "unlimited" }),
  });
  const post = await postRes.json();
  console.log("\n=== POST /api/checkout (unlimited) ===\n");
  console.log(JSON.stringify(post, null, 2));

  const ok =
    status.checkoutEnabled &&
    status.clientTokenConfigured &&
    status.paddleConfigured &&
    (post.transactionId || post.code === "paddle_checkout_disabled");

  console.log(ok ? "\n✓ Checkout pipeline reachable\n" : "\n✗ Checkout not fully ready — see issues above\n");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
