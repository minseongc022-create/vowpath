/**
 * vowroad.com → effiroad.com: Porkbun root ALIAS + URL forwards.
 *
 *   export PORKBUN_API_KEY=...
 *   export PORKBUN_SECRET_KEY=...
 *   node scripts/porkbun-vowroad-forward.mjs
 */
const DOMAIN = "vowroad.com";
const FORWARD_TARGET = "https://effiroad.com";
const ROOT_ALIAS = "uixie.porkbun.com";
const GSC_TXT = process.env.GOOGLE_SITE_VERIFICATION_VOWROAD?.trim();

const apiKey = process.env.PORKBUN_API_KEY?.trim();
const secretKey = process.env.PORKBUN_SECRET_KEY?.trim();

async function porkbun(path, body = {}) {
  const res = await fetch(`https://api.porkbun.com/api/json/v3${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, secretapikey: secretKey, ...body }),
  });
  return res.json();
}

function isRootName(name) {
  return !name || name === "@" || name === DOMAIN;
}

async function ensureRootAlias() {
  const result = await porkbun(`/dns/retrieve/${DOMAIN}`);
  if (result.status !== "SUCCESS") {
    console.log(`✗ DNS retrieve:`, result.message ?? result);
    return false;
  }

  const records = result.records ?? [];
  const rootRecords = records.filter((r) => isRootName(r.name));
  const alias = rootRecords.find(
    (r) =>
      r.type === "ALIAS" &&
      String(r.content).replace(/\.$/, "") === ROOT_ALIAS,
  );

  if (alias) {
    console.log(`✓ ${DOMAIN} ALIAS @ → ${ROOT_ALIAS} (id ${alias.id})`);
    return true;
  }

  const conflicting = rootRecords.filter((r) => r.type === "A" || r.type === "CNAME");
  if (conflicting.length) {
    console.log(`✗ ${DOMAIN} root has conflicting records (delete A/CNAME @ first):`);
    for (const r of conflicting) {
      console.log(`    ${r.type} id=${r.id} content=${r.content}`);
    }
    return false;
  }

  const create = await porkbun(`/dns/create/${DOMAIN}`, {
    name: "",
    type: "ALIAS",
    content: ROOT_ALIAS,
  });
  if (create.status === "SUCCESS") {
    console.log(`✓ ${DOMAIN} ALIAS @ → ${ROOT_ALIAS} (created id ${create.id})`);
    return true;
  }
  console.log(`✗ ${DOMAIN} ALIAS create:`, create.message ?? create);
  return false;
}

async function ensureGoogleSiteVerificationTxt() {
  if (!GSC_TXT) {
    console.log("○ Skip GSC TXT — set GOOGLE_SITE_VERIFICATION_VOWROAD (from Search Console DNS verify)");
    return true;
  }

  const value = GSC_TXT.startsWith("google-site-verification=")
    ? GSC_TXT
    : `google-site-verification=${GSC_TXT}`;

  const result = await porkbun(`/dns/retrieve/${DOMAIN}`);
  if (result.status !== "SUCCESS") {
    console.log(`✗ DNS retrieve:`, result.message ?? result);
    return false;
  }

  const existing = (result.records ?? []).find(
    (r) => r.type === "TXT" && isRootName(r.name) && String(r.content).includes("google-site-verification"),
  );
  if (existing) {
    const same = String(existing.content).replace(/\.$/, "") === value;
    console.log(
      `${same ? "✓" : "○"} ${DOMAIN} TXT @ google-site-verification (id ${existing.id}${same ? "" : ", update in Porkbun UI if token changed"})`,
    );
    return same;
  }

  const create = await porkbun(`/dns/create/${DOMAIN}`, {
    name: "",
    type: "TXT",
    content: value,
  });
  if (create.status === "SUCCESS") {
    console.log(`✓ ${DOMAIN} TXT @ ${value.slice(0, 40)}… (created id ${create.id})`);
    return true;
  }
  console.log(`✗ ${DOMAIN} TXT create:`, create.message ?? create);
  return false;
}

async function setForward(subdomain = "") {
  const label = subdomain ? `${subdomain}.${DOMAIN}` : DOMAIN;
  const result = await porkbun(`/domain/forward/${DOMAIN}`, {
    subdomain,
    location: FORWARD_TARGET,
    type: "permanent",
    includePath: "yes",
    wildcard: subdomain ? "false" : "true",
  });
  if (result.status === "SUCCESS") {
    console.log(`✓ ${label} → ${FORWARD_TARGET}`);
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

  console.log("\n=== Porkbun vowroad.com setup ===\n");

  let ok = 0;
  if (await ensureRootAlias()) ok++;
  if (await ensureGoogleSiteVerificationTxt()) ok++;
  if (await setForward("")) ok++;
  if (await setForward("www")) ok++;
  if (await setForward("link")) ok++;
  if (await setForward("book")) ok++;
  if (await setForward("go")) ok++;

  console.log(`\n${ok}/7 steps OK\n`);
  if (ok < 1) process.exit(1);
}

main();
