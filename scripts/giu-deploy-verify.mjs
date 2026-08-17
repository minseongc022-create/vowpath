/**
 * Verify giucuu.com production reflects the expected GIU deploy.
 * Usage: node scripts/giu-deploy-verify.mjs [baseUrl]
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

async function main() {
  const expected = expectedDeployVersion();
  console.log(`\n=== Giu deploy verify (${base}) ===\n`);
  console.log(`Expected deployVersion: ${expected}\n`);

  let ok = true;

  const healthUrl = `${base}/api/giu/health`;
  try {
    const healthRes = await fetch(healthUrl, { redirect: "follow" });
    const health = await healthRes.json().catch(() => null);
    const versionOk =
      healthRes.ok &&
      health?.ok === true &&
      health?.deployVersion === expected &&
      health?.features?.customerQrUx === true;
    console.log(
      `${versionOk ? "✓" : "✗"} ${healthUrl} → ${healthRes.status} deployVersion=${health?.deployVersion ?? "?"} commit=${health?.commit ?? "?"}`,
    );
    if (!versionOk) ok = false;
  } catch (e) {
    console.log(`✗ ${healthUrl} — ${e instanceof Error ? e.message : e}`);
    ok = false;
  }

  const cssChecks = ["f6f8f4", "2d6a3e", "e8b923"];
  try {
    const { res, text } = await fetchText(`${base}/hop`);
    const cssPaths = [...text.matchAll(/\/_next\/static\/css\/[a-z0-9]+\.css/g)].map(
      (m) => m[0],
    );
    const uniqueCss = [...new Set(cssPaths)].slice(0, 6);
    let cssOk = false;
    for (const path of uniqueCss) {
      const { text: css } = await fetchText(`${base}${path}`);
      if (cssChecks.every((c) => css.includes(c))) {
        cssOk = true;
        console.log(`✓ CSS palette (${path})`);
        break;
      }
    }
    if (!cssOk) {
      console.log(`✗ CSS palette — missing ${cssChecks.join(", ")} in ${uniqueCss.length} bundles`);
      ok = false;
    }
    if (!res.ok) {
      console.log(`✗ ${base}/hop → ${res.status}`);
      ok = false;
    }
  } catch (e) {
    console.log(`✗ ${base}/hop — ${e instanceof Error ? e.message : e}`);
    ok = false;
  }

  const chunkChecks = ["마감 된", "픽업 대기", "로그아웃"];
  try {
    const { text: hopHtml } = await fetchText(`${base}/hop`);
    const chunkPaths = [...hopHtml.matchAll(/\/_next\/static\/chunks\/6931-[a-z0-9]+\.js/g)].map(
      (m) => m[0],
    );
    const chunkPath = chunkPaths[0];
    if (!chunkPath) {
      console.log("✗ JS markers — 6931 chunk not found on /hop");
      ok = false;
    } else {
      const { res, text } = await fetchText(`${base}${chunkPath}`);
      const found = chunkChecks.filter((m) => text.includes(m));
      const chunkOk = res.ok && found.length === chunkChecks.length;
      console.log(
        `${chunkOk ? "✓" : "✗"} JS markers (${found.length}/${chunkChecks.length}) on ${chunkPath}`,
      );
      if (!chunkOk) ok = false;
    }
  } catch (e) {
    console.log(`✗ JS chunk check — ${e instanceof Error ? e.message : e}`);
    ok = false;
  }

  console.log(`\n${ok ? "✓ Giu production deploy verified" : "✗ Giu production deploy FAILED verification"}\n`);
  process.exit(ok ? 0 : 1);
}

main();
