-- Reference copy of the SQL `npx prisma db push` will run to create the dajeong_* operational
-- tables (companions/sharing/notifications/push/anonymous-claim). This repo uses `prisma db
-- push` for schema sync (see package.json's learn:push script; there is no prisma/migrations
-- history to extend), so this file is NOT a Prisma Migrate migration — it exists purely so an
-- operator can review the exact DDL before running db push against a real database. Generated
-- with: npx prisma migrate diff --from-schema-datamodel <schema before this change>
-- --to-schema-datamodel prisma/schema.prisma --script
--
-- After `db push`, run the block at the bottom of this file ONCE by hand — db push does not
-- apply partial/filtered unique indexes (Prisma's declarative @@unique doesn't support a WHERE
-- clause), so dajeong_notifications' "at most one scheduled row per (person, dedupeKey)"
-- guarantee needs this extra statement.

-- CreateTable
CREATE TABLE "dajeong_people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dajeong_companion_invites" (
    "code" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_companion_invites_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "dajeong_companion_links" (
    "id" TEXT NOT NULL,
    "memberAId" TEXT NOT NULL,
    "memberAName" TEXT NOT NULL,
    "memberBId" TEXT NOT NULL,
    "memberBName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dajeong_companion_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dajeong_shared_plans" (
    "planId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "companionName" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dajeong_shared_plans_pkey" PRIMARY KEY ("planId")
);

-- CreateTable
CREATE TABLE "dajeong_pace_preferences" (
    "personId" TEXT NOT NULL,
    "companionKey" TEXT NOT NULL,
    "density" TEXT,
    "placesPerDay" INTEGER,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_pace_preferences_pkey" PRIMARY KEY ("personId","companionKey")
);

-- CreateTable
CREATE TABLE "dajeong_registered_plans" (
    "planId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_registered_plans_pkey" PRIMARY KEY ("planId")
);

-- CreateTable
CREATE TABLE "dajeong_weather_digests" (
    "planId" TEXT NOT NULL,
    "digest" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_weather_digests_pkey" PRIMARY KEY ("planId")
);

-- CreateTable
CREATE TABLE "dajeong_push_subscriptions" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dajeong_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dajeong_notification_preferences" (
    "personId" TEXT NOT NULL,
    "masterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB NOT NULL,
    "secretPrivacyLevel" TEXT NOT NULL DEFAULT 'content_hidden',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dajeong_notification_preferences_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "dajeong_notifications" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planVersion" INTEGER NOT NULL,
    "targetPersonId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "privacyAtSend" TEXT NOT NULL,
    "deepLink" TEXT NOT NULL,
    "relatedItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "supersededBy" TEXT,
    "failureReason" TEXT,

    CONSTRAINT "dajeong_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dajeong_anonymous_claims" (
    "anonymousId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dajeong_anonymous_claims_pkey" PRIMARY KEY ("anonymousId")
);

-- CreateIndex
CREATE INDEX "dajeong_companion_invites_fromId_status_idx" ON "dajeong_companion_invites"("fromId", "status");

-- CreateIndex
CREATE INDEX "dajeong_companion_links_memberBId_idx" ON "dajeong_companion_links"("memberBId");

-- CreateIndex
CREATE UNIQUE INDEX "dajeong_companion_links_memberAId_memberBId_key" ON "dajeong_companion_links"("memberAId", "memberBId");

-- CreateIndex
CREATE INDEX "dajeong_shared_plans_ownerId_idx" ON "dajeong_shared_plans"("ownerId");

-- CreateIndex
CREATE INDEX "dajeong_shared_plans_companionId_idx" ON "dajeong_shared_plans"("companionId");

-- CreateIndex
CREATE INDEX "dajeong_registered_plans_ownerId_idx" ON "dajeong_registered_plans"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "dajeong_push_subscriptions_endpoint_key" ON "dajeong_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "dajeong_push_subscriptions_personId_idx" ON "dajeong_push_subscriptions"("personId");

-- CreateIndex
CREATE INDEX "dajeong_notifications_targetPersonId_status_idx" ON "dajeong_notifications"("targetPersonId", "status");

-- CreateIndex
CREATE INDEX "dajeong_notifications_status_scheduledFor_idx" ON "dajeong_notifications"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "dajeong_notifications_planId_idx" ON "dajeong_notifications"("planId");

-- CreateIndex
CREATE INDEX "dajeong_anonymous_claims_accountId_idx" ON "dajeong_anonymous_claims"("accountId");


-- ─── Run this once, by hand, after `npx prisma db push` ──────────────────────
-- Enforces "at most one scheduled notification per (targetPersonId, dedupeKey)" at the database
-- level, on top of the application-level check in notification-store.ts's reconcileNotifications.
-- A plain @@unique across (targetPersonId, dedupeKey, status) would wrongly block having two
-- different *historical* rows both in "superseded" status for the same dedupeKey — a partial
-- index scoped to status = 'scheduled' is the correct constraint and Postgres-specific syntax
-- Prisma's schema language cannot express declaratively.
CREATE UNIQUE INDEX IF NOT EXISTS "dajeong_notifications_active_dedupe_key"
  ON "dajeong_notifications" ("targetPersonId", "dedupeKey")
  WHERE "status" = 'scheduled';
