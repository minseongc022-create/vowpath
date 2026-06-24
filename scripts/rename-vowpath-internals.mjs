/**
 * Rename internal vowpath identifiers → vowroad (API paths, KV keys, types, portal host).
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
  ["estimatedMissedWithoutVowpath", "estimatedMissedWithoutVowroad"],
  ["attributedToVowpath", "attributedToVowroad"],
  ["VowpathAiResponse", "VowroadAiResponse"],
  ["VowpathAiAction", "VowroadAiAction"],
  ["VowpathAiView", "VowroadAiView"],
  ["VowpathAiPage", "VowroadAiPage"],
  ["IconVowpathAi", "IconVowroadAi"],
  ["VowpathMark", "VowroadMark"],
  ["vowpath-ai-query", "vowroad-ai-query"],
  ["/api/vowpath-ai", "/api/vowroad-ai"],
  ["vowpath-intake-photos", "vowroad-intake-photos"],
  ["vowpath-intake-draft", "vowroad-intake-draft"],
  ["vowpath_remember_login", "vowroad_remember_login"],
  ["vowpath_locale", "vowroad_locale"],
  ["__vowpathGoogleMapsReady", "__vowroadGoogleMapsReady"],
  ["data-vowpath-google-maps", "data-vowroad-google-maps"],
  ["vowpathCallId", "vowroadCallId"],
  ["vowpathBookingId", "vowroadBookingId"],
  ["www.hvacsvc.link", "link.vowroad.com"],
  ["hvacsvc.link", "link.vowroad.com"],
  ['source: "vowpath"', 'source: "vowroad"'],
  ['=== "vowpath"', '=== "vowroad"'],
  ["vowpath:", "vowroad:"],
  ["@vowpath.local", "@vowroad.local"],
  ["n === \"vowpath\"", "n === \"vowroad\""],
  ["vowpathEvent", "vowroadEvent"],
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
  ["lib/vowpath-ai-query.ts", "lib/vowroad-ai-query.ts"],
  ["components/dashboard/VowpathAiView.tsx", "components/dashboard/VowroadAiView.tsx"],
  ["components/brand/VowpathMark.tsx", "components/brand/VowroadMark.tsx"],
  ["app/api/vowpath-ai", "app/api/vowroad-ai"],
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
