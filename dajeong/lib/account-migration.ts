import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { isDatabaseConfigured } from "./db";

export type ClaimResult =
  | { ok: true; alreadyClaimed: boolean }
  | { ok: false; error: string };

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Moves every row this browser's anonymous device id owns onto the newly-logged-in account, so
 * "생성해 두었던 계획/prep/secret/동반자 초대/알림 설정" survive login instead of being orphaned
 * under an id the user has no way to prove is theirs anymore.
 *
 * Safety guarantee: `DajeongAnonymousClaim.anonymousId` is the primary key, and this whole
 * operation runs in one transaction gated by inserting that row first. A second claim attempt
 * for the same anonymous id — by ANY account, including a race from the same account's two open
 * tabs — either finds the row already claimed by this same account (idempotent no-op) or by a
 * different one (rejected outright). There is no path that lets one account's anonymous history
 * end up attributed to a different account.
 *
 * Where a target row already exists under the account id (e.g. they'd already logged in and set
 * notification preferences before this anonymous session existed), the account's existing row
 * wins and the anonymous one is dropped — never silently overwritten, never duplicated.
 */
export async function claimAnonymousIdentity(anonymousId: string, accountId: string): Promise<ClaimResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: "DB가 설정되지 않아 계정 이전을 처리할 수 없어." };
  if (!anonymousId.trim() || anonymousId.startsWith("user_")) return { ok: false, error: "이전할 익명 데이터가 아니야." };
  const targetPersonId = `user_${accountId}`;
  if (anonymousId === targetPersonId) return { ok: true, alreadyClaimed: true };

  return prisma.$transaction(async (tx) => {
    const existingClaim = await tx.dajeongAnonymousClaim.findUnique({ where: { anonymousId } });
    if (existingClaim) {
      if (existingClaim.accountId !== accountId) return { ok: false, error: "이 데이터는 이미 다른 계정으로 이전됐어." };
      return { ok: true, alreadyClaimed: true };
    }
    await tx.dajeongAnonymousClaim.create({ data: { anonymousId, accountId } });

    // Person profile: rename onto the account id, or drop if the account already has one.
    try {
      await tx.dajeongPerson.update({ where: { id: anonymousId }, data: { id: targetPersonId } });
    } catch (error) {
      if (isUniqueConflict(error)) await tx.dajeongPerson.deleteMany({ where: { id: anonymousId } });
      else if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")) throw error;
    }

    // Invites this person sent, or accepted.
    await tx.dajeongCompanionInvite.updateMany({ where: { fromId: anonymousId }, data: { fromId: targetPersonId } });
    await tx.dajeongCompanionInvite.updateMany({ where: { acceptedBy: anonymousId }, data: { acceptedBy: targetPersonId } });

    // Companion links: re-sort the pair with the new id substituted in, merging into an
    // existing account<->companion link if one already exists rather than violating the
    // canonical-pair unique constraint.
    const links = await tx.dajeongCompanionLink.findMany({ where: { OR: [{ memberAId: anonymousId }, { memberBId: anonymousId }] } });
    for (const link of links) {
      const otherId = link.memberAId === anonymousId ? link.memberBId : link.memberAId;
      const otherName = link.memberAId === anonymousId ? link.memberBName : link.memberAName;
      const myName = link.memberAId === anonymousId ? link.memberAName : link.memberBName;
      if (otherId === targetPersonId) {
        // Would become a self-link (this account was already connected to itself under the
        // anonymous id, e.g. testing) — just drop it.
        await tx.dajeongCompanionLink.delete({ where: { id: link.id } });
        continue;
      }
      const [memberAId, memberBId] = targetPersonId < otherId ? [targetPersonId, otherId] : [otherId, targetPersonId];
      const [memberAName, memberBName] = targetPersonId < otherId ? [myName, otherName] : [otherName, myName];
      const conflict = await tx.dajeongCompanionLink.findUnique({ where: { memberAId_memberBId: { memberAId, memberBId } } });
      if (conflict && conflict.id !== link.id) {
        await tx.dajeongCompanionLink.delete({ where: { id: link.id } });
      } else {
        await tx.dajeongCompanionLink.update({ where: { id: link.id }, data: { memberAId, memberAName, memberBId, memberBName } });
      }
    }

    // Shared plans: planId is the primary key, so re-pointing owner/companion never collides.
    await tx.dajeongSharedPlan.updateMany({ where: { ownerId: anonymousId }, data: { ownerId: targetPersonId } });
    await tx.dajeongSharedPlan.updateMany({ where: { companionId: anonymousId }, data: { companionId: targetPersonId } });

    // Pace preferences: composite key (personId, companionKey) — keep the account's existing
    // preference for a given companion if there's a conflict, matching the person-row policy.
    const paces = await tx.dajeongPacePreference.findMany({ where: { personId: anonymousId } });
    for (const pace of paces) {
      const conflict = await tx.dajeongPacePreference.findUnique({ where: { personId_companionKey: { personId: targetPersonId, companionKey: pace.companionKey } } });
      if (conflict) {
        await tx.dajeongPacePreference.delete({ where: { personId_companionKey: { personId: anonymousId, companionKey: pace.companionKey } } });
      } else {
        await tx.dajeongPacePreference.update({
          where: { personId_companionKey: { personId: anonymousId, companionKey: pace.companionKey } },
          data: { personId: targetPersonId },
        });
      }
    }

    // Registered solo plans for proactive notifications — planId is the primary key.
    await tx.dajeongRegisteredPlan.updateMany({ where: { ownerId: anonymousId }, data: { ownerId: targetPersonId } });

    // Push subscriptions — endpoint is the unique key, personId is not, so this never collides.
    await tx.dajeongPushSubscription.updateMany({ where: { personId: anonymousId }, data: { personId: targetPersonId } });

    // Notification preferences — personId is the primary key; the account's existing
    // preferences (if any) win over the anonymous session's.
    const anonPrefs = await tx.dajeongNotificationPreference.findUnique({ where: { personId: anonymousId } });
    if (anonPrefs) {
      const accountPrefs = await tx.dajeongNotificationPreference.findUnique({ where: { personId: targetPersonId } });
      if (accountPrefs) {
        await tx.dajeongNotificationPreference.delete({ where: { personId: anonymousId } });
      } else {
        await tx.dajeongNotificationPreference.update({ where: { personId: anonymousId }, data: { personId: targetPersonId } });
      }
    }

    // Scheduled/historical notifications — id is the primary key, so this never collides either.
    await tx.dajeongNotification.updateMany({ where: { targetPersonId: anonymousId }, data: { targetPersonId } });

    return { ok: true, alreadyClaimed: false };
  });
}
