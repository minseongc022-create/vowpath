/**
 * Verify giucuu.com production reflects the expected GIU deploy.
 * Usage: node scripts/giu-deploy-verify.mjs [baseUrl]
 *
 * User-facing checks (CSS palette + JS strings) are required.
 * /api/giu/health is preferred when present; 404 while Vercel promotes is non-fatal
 * if CSS/JS already match.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] ?? "https://www.giucuu.com").replace(/\/$/, "");

function expectedDeployVersion() {
  const src = readFileSync(join(root, "giu/lib/deploy-version.ts"), "utf8");
  const match = src.match(/GIU_DEPLOY_VERSION\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("GIU_DEPLOY_VERSION not found in deploy-version");
  return match[1];
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { res, text: await res.text() };
}

async function checkHealth(expected) {
  const healthUrl = `${base}/api/giu/health`;
  try {
    const healthRes = await fetch(healthUrl, { redirect: "follow" });
    const contentType = healthRes.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      console.log(`○ ${healthUrl} → ${healthRes.status} (health API not live yet)`);
      return "pending";
    }
    const health = await healthRes.json().catch(() => null);
    const versionOk =
      healthRes.ok &&
      health?.ok === true &&
      health?.deployVersion === expected &&
      health?.features?.customerQrUx === true;
    console.log(
      `${versionOk ? "✓" : "✗"} ${healthUrl} → ${healthRes.status} deployVersion=${health?.deployVersion ?? "?"} commit=${health?.commit ?? "?"}`,
    );
    return versionOk ? "ok" : "bad";
  } catch (e) {
    console.log(`○ ${healthUrl} — ${e instanceof Error ? e.message : e}`);
    return "pending";
  }
}

async function checkCss() {
  const cssChecks = ["fcf9f2", "3c2a21", "f9a825"];
  const { res, text } = await fetchText(`${base}/hop`);
  const cssPaths = [...text.matchAll(/\/_next\/static\/css\/[a-z0-9]+\.css/g)].map((m) => m[0]);
  const uniqueCss = [...new Set(cssPaths)].slice(0, 6);
  for (const path of uniqueCss) {
    const { text: css } = await fetchText(`${base}${path}`);
    if (cssChecks.every((c) => css.includes(c))) {
      console.log(`✓ CSS palette (${path})`);
      if (!res.ok) console.log(`✗ ${base}/hop → ${res.status}`);
      return res.ok;
    }
  }
  console.log(`✗ CSS palette — missing ${cssChecks.join(", ")} in ${uniqueCss.length} bundles`);
  if (!res.ok) console.log(`✗ ${base}/hop → ${res.status}`);
  return false;
}

async function checkJs() {
  const chunkChecks = ["픽업 대기", "로그아웃", "픽업 마감"];
  const { text: hopHtml } = await fetchText(`${base}/hop`);
  const chunkPaths = [
    ...hopHtml.matchAll(/\/_next\/static\/chunks\/[a-zA-Z0-9-]+\.js/g),
  ].map((m) => m[0]);
  const uniqueChunks = [...new Set(chunkPaths)];

  if (uniqueChunks.length === 0) {
    console.log("✗ JS markers — no JS chunks found on /hop");
    return false;
  }

  const foundSet = new Set();
  for (const chunkPath of uniqueChunks.slice(0, 40)) {
    try {
      const { res, text } = await fetchText(`${base}${chunkPath}`);
      if (!res.ok) continue;
      for (const marker of chunkChecks) {
        if (text.includes(marker)) foundSet.add(marker);
      }
      if (foundSet.size === chunkChecks.length) break;
    } catch {
      // try next chunk
    }
  }

  const found = chunkChecks.filter((m) => foundSet.has(m));
  const chunkOk = found.length === chunkChecks.length;
  console.log(
    `${chunkOk ? "✓" : "✗"} JS markers (${found.length}/${chunkChecks.length}) across ${uniqueChunks.length} chunks`,
  );
  return chunkOk;
}

async function main() {
  const expected = expectedDeployVersion();
  console.log(`\n=== Giu deploy verify (${base}) ===\n`);
  console.log(`Expected deployVersion: ${expected}\n`);

  const health = await checkHealth(expected);
  let cssOk = false;
  let jsOk = false;
  try {
    cssOk = await checkCss();
  } catch (e) {
    console.log(`✗ CSS check — ${e instanceof Error ? e.message : e}`);
  }
  try {
    jsOk = await checkJs();
  } catch (e) {
    console.log(`✗ JS check — ${e instanceof Error ? e.message : e}`);
  }

  const userFacingOk = cssOk && jsOk;
  const healthOk = health === "ok";
  const healthPending = health === "pending";

  let ok = false;
  if (healthOk && userFacingOk) {
    ok = true;
  } else if (healthPending && userFacingOk) {
    console.log("○ Health API pending — CSS/JS confirm user-facing deploy is live");
    ok = true;
  } else if (health === "bad") {
    ok = false;
  } else {
    ok = userFacingOk;
  }

  console.log(
    `\n${ok ? "✓ Giu production deploy verified" : "✗ Giu production deploy FAILED verification"}\n`,
  );
  process.exit(ok ? 0 : 1);
}

main();
