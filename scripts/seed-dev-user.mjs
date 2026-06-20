/**
 * Ensure local dev user in data/users.json for E2E scripts.
 * Usage: node scripts/seed-dev-user.mjs
 */
import { ensureDevUser } from "./lib/e2e-session.mjs";

const user = ensureDevUser();
console.log(JSON.stringify({ ok: true, id: user.id, email: user.email, phone: user.phone }, null, 2));
