import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { dajeongPrisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.dajeongPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.dajeongPrisma = prisma;
}

/** Dajeong login only — kept isolated from Learn/Effiroad the same way Learn is isolated
 * from Effiroad's dispatch DB. All three point at the same Postgres instance but never
 * share a "configured" flag, so one product's env setup can't silently switch another on. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DAJEONG_DATABASE_URL?.trim());
}

/**
 * @auth/prisma-adapter hardcodes `prisma.user` / `.account` / `.session` /
 * `.verificationToken` with no way to point it at differently-named models. Because this
 * schema also has Learn's `User`/`Account`/`Session` models, handing the adapter the raw
 * `prisma` client would make dajeong login silently read and write Learn's user rows. This
 * shim renames dajeong's own models onto the property names the adapter expects, so it
 * only ever touches `dajeong_*` tables.
 */
export const dajeongAuthAdapterClient = {
  user: prisma.dajeongUser,
  account: prisma.dajeongAccount,
  session: prisma.dajeongSession,
  verificationToken: prisma.dajeongVerificationToken,
};
