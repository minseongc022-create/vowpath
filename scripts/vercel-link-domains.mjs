/**
 * Attach legacy domains to the Vercel project (requires API token).
 *
 * hvacsvc.link is registered on Namecheap (DNS already → Vercel). Link it here
 * so middleware can return 410 Gone + noindex and Google drops the old listing.
 *
 *   export VERCEL_TOKEN=...          # vercel.com/account/tokens
 *   export VERCEL_PROJECT_ID=...     # Project → Settings → General
 *   export VERCEL_TEAM_ID=...        # optional, team projects only
 *   node scripts/vercel-link-domains.mjs
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const token = process.env.VERCEL_TOKEN?.trim();
const projectId = process.env.VERCEL_PROJECT_ID?.trim();
const teamId = process.env.VERCEL_TEAM_ID?.trim();

const GIU_DOMAIN = (process.env.GIU_DOMAIN || "giucuu.com").trim().toLowerCase();

const DOMAINS = [
  "www.effiroad.com",
  "vowroad.com",
  "www.vowroad.com",
  "link.vowroad.com",
  "book.vowroad.com",
  "go.vowroad.com",
  GIU_DOMAIN,
  `www.${GIU_DOMAIN}`,
];

async function api(path, method = "GET", body) {
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

async function main() {
  if (!token || !projectId) {
    console.error(
      "Set VERCEL_TOKEN and VERCEL_PROJECT_ID (see script header). Cannot modify Vercel domains without them.",
    );
    process.exit(1);
  }

  console.log("\n=== Link domains to Vercel project ===\n");

  for (const name of DOMAINS) {
    const { ok, status, json } = await api(`/v10/projects/${projectId}/domains`, "POST", {
      name,
    });
    if (ok) {
      console.log(`✓ ${name} — linked (configure redirect in Vercel Domains UI if needed)`);
    } else if (status === 409 || json?.error?.code === "domain_already_in_use") {
      console.log(`· ${name} — already linked or in use`);
    } else {
      console.log(`✗ ${name} — ${status}`, json?.error?.message ?? json);
    }
  }

  console.log("\nAfter linking, redeploy and run: npm run seo:ping\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
