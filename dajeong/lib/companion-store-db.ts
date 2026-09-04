import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { CompanionInvite, CompanionLink, CompanionRelationLabel, DajeongPlan, PacePreference } from "./types";
import type { SharedPlanRecord } from "./companion-store-file";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function newInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/** Canonical (A,B) ordering so a pair is reachable from either direction with one row and one
 * unique index, instead of needing to check both (a,b) and (b,a). */
function sortedPair(aId: string, bId: string): [string, string] {
  return aId < bId ? [aId, bId] : [bId, aId];
}

function linkFromRow(row: { id: string; memberAId: string; memberAName: string; memberBId: string; memberBName: string; relation: string; createdAt: Date }): CompanionLink {
  return {
    id: row.id,
    memberIds: [row.memberAId, row.memberBId],
    memberNames: [row.memberAName, row.memberBName],
    relationLabel: row.relation as CompanionRelationLabel,
    createdAt: row.createdAt.toISOString(),
  };
}

function inviteFromRow(row: { code: string; fromId: string; fromName: string; relation: string; note: string | null; status: string; acceptedBy: string | null; createdAt: Date; expiresAt: Date }): CompanionInvite {
  return {
    code: row.code,
    fromId: row.fromId,
    fromName: row.fromName,
    relationLabel: row.relation as CompanionRelationLabel,
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status as CompanionInvite["status"],
    acceptedBy: row.acceptedBy ?? undefined,
  };
}

function sharedPlanFromRow(row: { planId: string; ownerId: string; ownerName: string; companionId: string; companionName: string; plan: unknown; version: number; updatedAt: Date }): SharedPlanRecord {
  return {
    planId: row.planId,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    companionId: row.companionId,
    companionName: row.companionName,
    plan: row.plan as DajeongPlan,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertPerson(id: string, name: string): Promise<void> {
  await prisma.dajeongPerson.upsert({
    where: { id },
    create: { id, name: name.trim().slice(0, 20) || "나" },
    update: { name: name.trim().slice(0, 20) || "나" },
  });
}

export async function createInvite(fromId: string, fromName: string, relationLabel: CompanionRelationLabel, note?: string): Promise<CompanionInvite> {
  // One pending invite per sender, matching the file store's cap: cancel earlier pending
  // invites from this person before creating the new one.
  await prisma.dajeongCompanionInvite.updateMany({
    where: { fromId, status: "pending" },
    data: { status: "cancelled" },
  });
  const row = await prisma.dajeongCompanionInvite.create({
    data: {
      code: newInviteCode(),
      fromId,
      fromName: fromName.trim().slice(0, 20) || "나",
      relation: relationLabel,
      note: note?.trim().slice(0, 80) || undefined,
      status: "pending",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return inviteFromRow(row);
}

export async function listInvitesFrom(personId: string): Promise<CompanionInvite[]> {
  const rows = await prisma.dajeongCompanionInvite.findMany({
    where: { fromId: personId, status: "pending", expiresAt: { gt: new Date() } },
  });
  return rows.map(inviteFromRow);
}

export async function findLink(aId: string, bId: string): Promise<CompanionLink | null> {
  const [memberAId, memberBId] = sortedPair(aId, bId);
  const row = await prisma.dajeongCompanionLink.findUnique({ where: { memberAId_memberBId: { memberAId, memberBId } } });
  return row ? linkFromRow(row) : null;
}

export async function acceptInvite(code: string, accepterId: string, accepterName: string): Promise<{ link: CompanionLink } | { error: string }> {
  const invite = await prisma.dajeongCompanionInvite.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!invite) return { error: "초대 코드를 찾지 못했어." };
  if (invite.status !== "pending") return { error: "이미 사용됐거나 취소된 초대야." };
  if (invite.expiresAt.getTime() < Date.now()) return { error: "초대 코드가 만료됐어. 새 초대를 받아줘." };
  if (invite.fromId === accepterId) return { error: "자기 자신을 동반자로 연결할 수 없어." };

  const [memberAId, memberBId] = sortedPair(invite.fromId, accepterId);
  const trimmedName = accepterName.trim().slice(0, 20) || "동반자";
  const [memberAName, memberBName] = invite.fromId === memberAId ? [invite.fromName, trimmedName] : [trimmedName, invite.fromName];

  const link = await prisma.$transaction(async (tx) => {
    const existing = await tx.dajeongCompanionLink.findUnique({ where: { memberAId_memberBId: { memberAId, memberBId } } });
    await tx.dajeongCompanionInvite.update({ where: { code: invite.code }, data: { status: "accepted", acceptedBy: accepterId } });
    await tx.dajeongPerson.upsert({ where: { id: accepterId }, create: { id: accepterId, name: trimmedName }, update: { name: trimmedName } });
    if (existing) return existing;
    return tx.dajeongCompanionLink.create({
      data: { memberAId, memberAName, memberBId, memberBName, relation: invite.relation },
    });
  });
  return { link: linkFromRow(link) };
}

export async function listCompanions(personId: string): Promise<Array<{ link: CompanionLink; companionId: string; companionName: string }>> {
  const rows = await prisma.dajeongCompanionLink.findMany({
    where: { OR: [{ memberAId: personId }, { memberBId: personId }] },
  });
  return rows.map((row) => {
    const link = linkFromRow(row);
    const index = link.memberIds[0] === personId ? 1 : 0;
    return { link, companionId: link.memberIds[index], companionName: link.memberNames[index] };
  });
}

export async function removeCompanion(linkId: string, actorId: string): Promise<boolean> {
  const link = await prisma.dajeongCompanionLink.findUnique({ where: { id: linkId } });
  if (!link || (link.memberAId !== actorId && link.memberBId !== actorId)) return false;
  await prisma.$transaction([
    prisma.dajeongCompanionLink.delete({ where: { id: linkId } }),
    prisma.dajeongSharedPlan.deleteMany({
      where: {
        OR: [
          { ownerId: link.memberAId, companionId: link.memberBId },
          { ownerId: link.memberBId, companionId: link.memberAId },
        ],
      },
    }),
  ]);
  return true;
}

function paceKey(personId: string, companionKey: string): string {
  return `${personId}::${companionKey}`;
}

export async function getPace(personId: string, companionKey: string): Promise<PacePreference | null> {
  const row = await prisma.dajeongPacePreference.findUnique({ where: { personId_companionKey: { personId, companionKey } } });
  if (!row) return null;
  return {
    personId: row.personId,
    companionKey: row.companionKey,
    density: (row.density as PacePreference["density"]) ?? undefined,
    placesPerDay: row.placesPerDay ?? undefined,
    notes: row.notes as string[],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertPace(personId: string, companionKey: string, update: { density?: PacePreference["density"]; placesPerDay?: number; notes?: string[] }): Promise<PacePreference> {
  const current = await getPace(personId, companionKey);
  const notes = Array.from(new Set([...(current?.notes ?? []), ...(update.notes ?? [])])).slice(-20);
  const row = await prisma.dajeongPacePreference.upsert({
    where: { personId_companionKey: { personId, companionKey } },
    create: { personId, companionKey, density: update.density ?? current?.density, placesPerDay: update.placesPerDay ?? current?.placesPerDay, notes },
    update: { density: update.density ?? current?.density, placesPerDay: update.placesPerDay ?? current?.placesPerDay, notes },
  });
  return {
    personId: row.personId,
    companionKey: row.companionKey,
    density: (row.density as PacePreference["density"]) ?? undefined,
    placesPerDay: row.placesPerDay ?? undefined,
    notes: row.notes as string[],
    updatedAt: row.updatedAt.toISOString(),
  };
}
void paceKey; // kept for parity with the file store's key shape; DB uses a real composite key instead.

export async function getSharedPlanRecord(planId: string): Promise<SharedPlanRecord | null> {
  const row = await prisma.dajeongSharedPlan.findUnique({ where: { planId } });
  return row ? sharedPlanFromRow(row) : null;
}

export async function listSharedWithMe(viewerId: string): Promise<SharedPlanRecord[]> {
  const rows = await prisma.dajeongSharedPlan.findMany({ where: { companionId: viewerId }, orderBy: { updatedAt: "desc" } });
  return rows.map(sharedPlanFromRow);
}

export async function listMySharedPlans(ownerId: string): Promise<SharedPlanRecord[]> {
  const rows = await prisma.dajeongSharedPlan.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } });
  return rows.map(sharedPlanFromRow);
}

export async function listAllSharedPlans(): Promise<SharedPlanRecord[]> {
  const rows = await prisma.dajeongSharedPlan.findMany();
  return rows.map(sharedPlanFromRow);
}

export async function shareplan(plan: DajeongPlan, ownerId: string, ownerName: string, companionId: string, companionName: string): Promise<{ ok: true; record: SharedPlanRecord } | { error: string }> {
  const link = await findLink(ownerId, companionId);
  if (!link) return { error: "연결된 동반자가 아니야. 먼저 동반자를 연결해줘." };
  const sharedPlan: DajeongPlan = { ...plan, ownerId, ownerName, planKind: "shared", companionId, companionName };
  const row = await prisma.dajeongSharedPlan.upsert({
    where: { planId: plan.id },
    create: { planId: plan.id, ownerId, ownerName, companionId, companionName, plan: sharedPlan as object, version: 1 },
    update: { ownerId, ownerName, companionId, companionName, plan: sharedPlan as object, version: 1 },
  });
  return { ok: true, record: sharedPlanFromRow(row) };
}

export async function unshareplan(planId: string, actorId: string): Promise<boolean> {
  const record = await prisma.dajeongSharedPlan.findUnique({ where: { planId } });
  if (!record || record.ownerId !== actorId) return false;
  await prisma.dajeongSharedPlan.delete({ where: { planId } });
  return true;
}

export async function publishSharedPlan(
  planId: string,
  actorId: string,
  updater: (current: DajeongPlan) => DajeongPlan,
  expectedVersion?: number,
): Promise<{ ok: true; record: SharedPlanRecord } | { ok: false; error: string; conflict?: SharedPlanRecord }> {
  const record = await prisma.dajeongSharedPlan.findUnique({ where: { planId } });
  if (!record || (record.ownerId !== actorId && record.companionId !== actorId)) return { ok: false, error: "이 계획을 찾을 수 없어." };
  if (expectedVersion != null && expectedVersion !== record.version) {
    return { ok: false, error: "다른 사람이 방금 이 계획을 바꿨어. 최신 내용을 다시 확인해줘.", conflict: sharedPlanFromRow(record) };
  }
  const nextPlan = updater(record.plan as DajeongPlan);
  const normalized: DajeongPlan = { ...nextPlan, planKind: "shared", ownerId: record.ownerId, ownerName: record.ownerName, companionId: record.companionId, companionName: record.companionName };
  // Compare-and-swap on version: if a concurrent writer already bumped it since our read above,
  // this update touches zero rows and we report the conflict instead of clobbering their write —
  // the same guarantee the file store's expectedVersion check gives, but race-free under real
  // concurrent requests (the file store's read-then-write is not atomic across requests).
  const result = await prisma.dajeongSharedPlan.updateMany({
    where: { planId, version: record.version },
    data: { plan: normalized as object, version: { increment: 1 } },
  });
  if (result.count === 0) {
    const latest = await prisma.dajeongSharedPlan.findUnique({ where: { planId } });
    return { ok: false, error: "다른 사람이 방금 이 계획을 바꿨어. 최신 내용을 다시 확인해줘.", conflict: latest ? sharedPlanFromRow(latest) : undefined };
  }
  const updated = await prisma.dajeongSharedPlan.findUniqueOrThrow({ where: { planId } });
  return { ok: true, record: sharedPlanFromRow(updated) };
}
