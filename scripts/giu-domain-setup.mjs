/**
 * Connect giucuu.com (or GIU_DOMAIN) to Vercel + Porkbun DNS.
 *
 * Prerequisites: domain purchased on Porkbun (or update DNS manually).
 *
 *   export VERCEL_TOKEN=...           # vercel.com/account/tokens
 *   export VERCEL_PROJECT_ID=...      # Project → Settings → General
 *   export VERCEL_TEAM_ID=...         # optional
 *   export PORKBUN_API_KEY=...
 *   export PORKBUN_SECRET_KEY=...
 *   export GIU_DOMAIN=giucuu.com      # optional, default giucuu.com
 *   node scripts/giu-domain-setup.mjs
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const DOMAIN = (process.env.GIU_DOMAIN || "giucuu.com").trim().toLowerCase();
const VERCEL_APEX = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

const token = process.env.VERCEL_TOKEN?.trim();
const projectId = process.env.VERCEL_PROJECT_ID?.trim();
const teamId = process.env.VERCEL_TEAM_ID?.trim();
const apiKey = process.env.PORKBUN_API_KEY?.trim();
const secretKey = process.env.PORKBUN_SECRET_KEY?.trim();

const HOSTS = [DOMAIN, `www.${DOMAIN}`];

async function vercelApi(path, method = "GET", body) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(`https://api.vercel.com${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}

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

async function linkVercelDomain(name) {
  const { ok, status, json } = await vercelApi(`/v10/projects/${projectId}/domains`, "POST", {
    name,
  });
  if (ok) {
    console.log(`✓ Vercel — ${name} linked`);
    return true;
  }
  if (status === 409 || json?.error?.code === "domain_already_in_use") {
    console.log(`· Vercel — ${name} already linked`);
    return true;
  }
  console.log(`✗ Vercel — ${name}:`, json?.error?.message ?? json);
  return false;
}

async function ensurePorkbunApex() {
  const result = await porkbun(`/dns/retrieve/${DOMAIN}`);
  if (result.status !== "SUCCESS") {
    console.log(`✗ Porkbun DNS retrieve:`, result.message ?? result);
    return false;
  }

  const records = result.records ?? [];
  const rootRecords = records.filter((r) => isRootName(r.name));

  const alias = rootRecords.find(
    (r) =>
      r.type === "ALIAS" &&
      String(r.content).replace(/\.$/, "") === VERCEL_CNAME,
  );
  if (alias) {
    console.log(`✓ ${DOMAIN} ALIAS @ → ${VERCEL_CNAME} (id ${alias.id})`);
    return true;
  }

  const aRecord = rootRecords.find(
    (r) => r.type === "A" && String(r.content) === VERCEL_APEX,
  );
  if (aRecord) {
    console.log(`✓ ${DOMAIN} A @ → ${VERCEL_APEX} (id ${aRecord.id})`);
    return true;
  }

  const conflicting = rootRecords.filter((r) =>
    ["A", "CNAME", "ALIAS"].includes(r.type),
  );
  if (conflicting.length) {
    console.log(`✗ ${DOMAIN} root has conflicting records — remove in Porkbun first:`);
    for (const r of conflicting) {
      console.log(`    ${r.type} id=${r.id} content=${r.content}`);
    }
    return false;
  }

  const create = await porkbun(`/dns/create/${DOMAIN}`, {
    name: "",
    type: "ALIAS",
    content: VERCEL_CNAME,
  });
  if (create.status === "SUCCESS") {
    console.log(`✓ ${DOMAIN} ALIAS @ → ${VERCEL_CNAME} (created id ${create.id})`);
    return true;
  }

  const createA = await porkbun(`/dns/create/${DOMAIN}`, {
    name: "",
    type: "A",
    content: VERCEL_APEX,
  });
  if (createA.status === "SUCCESS") {
    console.log(`✓ ${DOMAIN} A @ → ${VERCEL_APEX} (created id ${createA.id})`);
    return true;
  }

  console.log(`✗ ${DOMAIN} apex DNS:`, create.message ?? create, createA.message ?? createA);
  return false;
}

async function ensurePorkbunWww() {
  const result = await porkbun(`/dns/retrieve/${DOMAIN}`);
  if (result.status !== "SUCCESS") return false;

  const wwwHost = `www.${DOMAIN}`;
  const records = (result.records ?? []).filter((r) => r.name === wwwHost || r.name === "www");

  const cname = records.find(
    (r) =>
      r.type === "CNAME" &&
      String(r.content).replace(/\.$/, "") === VERCEL_CNAME,
  );
  if (cname) {
    console.log(`✓ ${wwwHost} CNAME → ${VERCEL_CNAME} (id ${cname.id})`);
    return true;
  }

  const create = await porkbun(`/dns/create/${DOMAIN}`, {
    name: "www",
    type: "CNAME",
    content: VERCEL_CNAME,
  });
  if (create.status === "SUCCESS") {
    console.log(`✓ ${wwwHost} CNAME → ${VERCEL_CNAME} (created id ${create.id})`);
    return true;
  }
  console.log(`✗ ${wwwHost} CNAME:`, create.message ?? create);
  return false;
}

async function main() {
  console.log(`\n=== Giu domain setup (${DOMAIN}) ===\n`);

  let ok = 0;
  let total = 0;

  if (token && projectId) {
    for (const name of HOSTS) {
      total++;
      if (await linkVercelDomain(name)) ok++;
    }
  } else {
    console.log("○ Skip Vercel — set VERCEL_TOKEN + VERCEL_PROJECT_ID");
  }

  if (apiKey && secretKey) {
    total += 2;
    if (await ensurePorkbunApex()) ok++;
    if (await ensurePorkbunWww()) ok++;
  } else {
    console.log("○ Skip Porkbun DNS — set PORKBUN_API_KEY + PORKBUN_SECRET_KEY");
    console.log(`  Manual: A @ ${VERCEL_APEX}  |  CNAME www ${VERCEL_CNAME}`);
  }

  console.log(`\n${ok}/${total || "0"} steps OK`);
  console.log(`\nAfter DNS propagates (~5–30 min), open https://${DOMAIN}`);
  console.log(`Set Vercel env: NEXT_PUBLIC_GIU_URL=https://${DOMAIN}`);
  console.log(`Set Vercel env: NEXT_PUBLIC_GIU_HOST=${DOMAIN}\n`);

  if (total > 0 && ok < 1) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
