/**
 * Point vowroad.com → effiroad.com via Porkbun URL forward (root + www).
 *
 *   export PORKBUN_API_KEY=...
 *   export PORKBUN_SECRET_KEY=...
 *   node scripts/porkbun-vowroad-forward.mjs
 */
const apiKey = process.env.PORKBUN_API_KEY?.trim();
const secretKey = process.env.PORKBUN_SECRET_KEY?.trim();
const TARGET = "https://effiroad.com";

async function porkbun(path, body = {}) {
  const res = await fetch(`https://api.porkbun.com/api/json/v3${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, secretapikey: secretKey, ...body }),
  });
  return res.json();
}

async function setForward(domain, subdomain = "") {
  const label = subdomain ? `${subdomain}.${domain}` : domain;
  const result = await porkbun(`/domain/forward/${domain}`, {
    subdomain,
    location: TARGET,
    type: "permanent",
    includePath: "yes",
    wildcard: subdomain ? "false" : "true",
  });
  if (result.status === "SUCCESS") {
    console.log(`✓ ${label} → ${TARGET}`);
    return true;
  }
  console.log(`✗ ${label}:`, result.message ?? result);
  return false;
}

async function main() {
  if (!apiKey || !secretKey) {
    console.error("Set PORKBUN_API_KEY and PORKBUN_SECRET_KEY (Porkbun → Account → API Access).");
    process.exit(1);
  }

  console.log("\n=== Porkbun vowroad.com forward ===\n");
  let ok = 0;
  if (await setForward("vowroad.com", "")) ok++;
  if (await setForward("vowroad.com", "www")) ok++;
  if (await setForward("vowroad.com", "link")) ok++;
  if (await setForward("vowroad.com", "book")) ok++;
  if (await setForward("vowroad.com", "go")) ok++;
  console.log(`\n${ok}/5 forwards set\n`);
  if (ok === 0) process.exit(1);
}

main();
