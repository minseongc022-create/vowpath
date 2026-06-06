/**
 * Dev-only: POST /api/dev/simulate-call with a session for the first local user.
 * Usage: node scripts/run-simulate-call.mjs [port]
 */
import { readFileSync } from "fs";
import { SignJWT } from "jose";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const envRaw = readFileSync(".env.local", "utf-8");
const secretMatch = envRaw.match(/^AUTH_SECRET=(.+)$/m);
const secret =
  secretMatch?.[1]?.trim() ||
  "dev-only-change-auth-secret-32chars";
const key = new TextEncoder().encode(secret);

const { users } = JSON.parse(readFileSync("data/users.json", "utf-8"));
const user = users[0];
if (!user) {
  console.error("No users in data/users.json");
  process.exit(1);
}

const token = await new SignJWT({
  email: user.email,
  shopName: user.shopName,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(user.id)
  .setIssuedAt()
  .setExpirationTime("2592000s")
  .sign(key);

const url = `http://localhost:${port}/api/dev/simulate-call`;
console.log(`POST ${url} as ${user.shopName} (${user.id.slice(0, 8)}…)`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `nightcall_session=${token}`,
  },
  body: "{}",
});

const data = await res.json();
console.log(`Status: ${res.status}`);
console.log(JSON.stringify(data, null, 2));
process.exit(res.ok ? 0 : 1);
