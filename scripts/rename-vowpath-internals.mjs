/**
 * Rename internal vowpath identifiers → effiroad (API paths, KV keys, types, portal host).
 * Run: node scripts/rename-vowpath-internals.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "public",
]);

const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json", ".ps1", ".example"]);

/** Longest-first to avoid partial replacements */
const REPLACEMENTS = [
  ["estimatedMissedWithoutVowpath", "estimatedMissedWithoutEffiroad"],
  ["attributedToVowpath", "attributedToEffiroad"],
  ["VowpathAiResponse", "EffiroadAiResponse"],
  ["VowpathAiAction", "EffiroadAiAction"],
  ["VowpathAiView", "EffiroadAiView"],
  ["VowpathAiPage", "EffiroadAiPage"],
  ["IconVowpathAi", "IconEffiroadAi"],
  ["VowpathMark", "EffiroadMark"],
  ["vowpath-ai-query", "effiroad-ai-query"],
  ["/api/vowpath-ai", "/api/effiroad-ai"],
  ["vowpath-intake-photos", "effiroad-intake-photos"],
  ["vowpath-intake-draft", "effiroad-intake-draft"],
  ["vowpath_remember_login", "effiroad_remember_login"],
  ["vowpath_locale", "effiroad_locale"],
  ["__vowpathGoogleMapsReady", "__effiroadGoogleMapsReady"],
  ["data-vowpath-google-maps", "data-effiroad-google-maps"],
  ["vowpathCallId", "effiroadCallId"],
  ["vowpathBookingId", "effiroadBookingId"],
  ["www.hvacsvc.link", "link.effiroad.com"],
  ["hvacsvc.link", "link.effiroad.com"],
  ['source: "vowpath"', 'source: "effiroad"'],
  ['=== "vowpath"', '=== "effiroad"'],
  ["vowpath:", "effiroad:"],
  ["@vowpath.local", "@effiroad.local"],
  ["n === \"vowpath\"", "n === \"effiroad\""],
  ["vowpathEvent", "effiroadEvent"],
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

// 1) File renames
const fileRenames = [
  ["lib/vowpath-ai-query.ts", "lib/effiroad-ai-query.ts"],
  ["components/dashboard/VowpathAiView.tsx", "components/dashboard/EffiroadAiView.tsx"],
  ["components/brand/VowpathMark.tsx", "components/brand/EffiroadMark.tsx"],
  ["app/api/vowpath-ai", "app/api/effiroad-ai"],
];

for (const [from, to] of fileRenames) {
  renamePath(from, to);
}

// 2) Content
let touched = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.startsWith("scripts" + path.sep + "rename-vowpath-internals.mjs")) continue;
  const before = readFileSync(file, "utf8");
  const after = applyReplacements(before);
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
    console.log("updated", rel);
  }
}

console.log(`done: ${touched} files updated`);
