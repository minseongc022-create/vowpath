#!/usr/bin/env node
/** Vercel build entry — ensures Prisma client exists even without DATABASE_URL. */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://build:build@localhost:5432/build";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const prisma = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", shell: true });
if (prisma.status !== 0) process.exit(prisma.status ?? 1);

const next = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true });
process.exit(next.status ?? 1);
