/**
 * Rebrand Vowroad → Effiroad (domains, copy, API paths, KV prefix, filenames).
 * Run: node scripts/rebrand-effiroad.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json", ".ps1", ".example"]);

const REPLACEMENTS = [
  ["estimatedMissedWithoutVowroad", "estimatedMissedWithoutEffiroad"],
  ["attributedToVowroad", "attributedToEffiroad"],
  ["VowroadAiResponse", "EffiroadAiResponse"],
  ["VowroadAiAction", "EffiroadAiAction"],
  ["VowroadAiView", "EffiroadAiView"],
  ["VowroadAiPage", "EffiroadAiPage"],
  ["IconVowroadAi", "IconEffiroadAi"],
  ["VowroadMark", "EffiroadMark"],
  ["vowroad-ai-query", "effiroad-ai-query"],
  ["/api/vowroad-ai", "/api/effiroad-ai"],
  ["vowroad-intake-photos", "effiroad-intake-photos"],
  ["vowroad-intake-draft", "effiroad-intake-draft"],
  ["vowroad_remember_login", "effiroad_remember_login"],
  ["vowroad_locale", "effiroad_locale"],
  ["__vowroadGoogleMapsReady", "__effiroadGoogleMapsReady"],
  ["data-vowroad-google-maps", "data-effiroad-google-maps"],
  ["vowroadCallId", "effiroadCallId"],
  ["vowroadBookingId", "effiroadBookingId"],
  ["support@vowroad.com", "support@effiroad.com"],
  ["link.vowroad.com", "link.effiroad.com"],
  ["book.vowroad.com", "book.effiroad.com"],
  ["go.vowroad.com", "go.effiroad.com"],
  ["vowroad.com", "effiroad.com"],
  ["@vowroad.local", "@effiroad.local"],
  ['source: "vowroad"', 'source: "effiroad"'],
  ['=== "vowroad"', '=== "effiroad"'],
  ["vowroad:", "effiroad:"],
  ["n === \"vowroad\"", "n === \"effiroad\""],
  ["vowroadEvent", "effiroadEvent"],
  ["VOWROAD", "EFFIROAD"],
  ["Vowroad", "Effiroad"],
  ["vowroad", "effiroad"],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function applyReplacements(content) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  return next;
}

function renamePath(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
  console.log("renamed", fromRel, "→", toRel);
}

const fileRenames = [
  ["lib/vowroad-ai-query.ts", "lib/effiroad-ai-query.ts"],
  ["components/dashboard/VowroadAiView.tsx", "components/dashboard/EffiroadAiView.tsx"],
  ["components/brand/VowroadMark.tsx", "components/brand/EffiroadMark.tsx"],
  ["app/api/vowroad-ai", "app/api/effiroad-ai"],
  ["scripts/migrate-kv-vowpath-to-vowroad.mjs", "scripts/migrate-kv-legacy-to-effiroad.mjs"],
];

for (const [from, to] of fileRenames) {
  try {
    renamePath(from, to);
  } catch (e) {
    console.warn("skip rename", from, e.message);
  }
}

let touched = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.includes("rebrand-effiroad.mjs")) continue;
  const before = readFileSync(file, "utf8");
  const after = applyReplacements(before);
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
    console.log("updated", rel);
  }
}

console.log(`done: ${touched} files updated`);
