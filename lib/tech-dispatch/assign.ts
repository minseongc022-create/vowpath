import { bookingShortRef } from "../booking-ref";
import { smsTechDispatchOfferBody } from "../sms-templates";
import { listCallLogs, patchCallLog } from "../call-logs";
import { listJobs } from "../jobs-db";
import { sendTechSms } from "./send-tech-sms";
import { resolveShopDisplayName } from "../link-intake-brand";
import { findUserById } from "../users-db";
import {
  clearTechPendingOffer,
  getTechAssignment,
  getTechDispatchSettings,
  getTechPendingOffer,
  saveTechAssignment,
  saveTechDispatchSettings,
  setTechPendingOffer,
} from "./store";
import type { TechAssignment, TechMember } from "./types";

export type JobOfferContext = {
  bookingId: string;
  customerName: string;
  issue: string;
  window: string;
  priority: string;
};

async function loadJobContext(
  userId: string,
  bookingId: string,
): Promise<JobOfferContext | null> {
  const [jobs, calls] = await Promise.all([listJobs(userId), listCallLogs(userId)]);

  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    const call = calls.find((c) => c.id === callId);
    if (!call) return null;
    return {
      bookingId,
      customerName: call.customerName?.trim() || "Customer",
      issue: call.issueType?.trim() || call.symptom?.trim() || "Service request",
      window: call.arrivalWindow?.trim() || "TBD",
      priority: call.priority || "P2",
    };
  }

  const job = jobs.find(
    (j) => j.id === bookingId || (j.jobberJobId && `jobber-${j.jobberJobId}` === bookingId),
  );
  if (job) {
    return {
      bookingId,
      customerName: job.customerName?.trim() || "Customer",
      issue: job.symptom?.trim() || "Service request",
      window: job.arrivalWindow?.trim() || "TBD",
      priority: job.priority || "P2",
    };
  }

  return null;
}

function eligibleTechs(
  settings: Awaited<ReturnType<typeof getTechDispatchSettings>>,
  ctx: JobOfferContext,
  excludeIds: Set<string>,
): TechMember[] {
  let pool = settings.techs.filter((t) => t.active && !excludeIds.has(t.id));
  if (settings.p1SeniorOnly && ctx.priority === "P1") {
    const seniors = pool.filter((t) => t.senior);
    if (seniors.length > 0) pool = seniors;
  }
  return pool;
}

function pickNextTech(
  pool: TechMember[],
  lastAssignedTechId: string | null,
): TechMember | null {
  if (!pool.length) return null;
  if (!lastAssignedTechId) return pool[0];
  const idx = pool.findIndex((t) => t.id === lastAssignedTechId);
  const nextIdx = idx >= 0 ? (idx + 1) % pool.length : 0;
  return pool[nextIdx];
}

function techOfferSms(params: {
  shopName: string;
  ctx: JobOfferContext;
  ref: string;
}): string {
  return smsTechDispatchOfferBody({
    shopName: params.shopName,
    customerName: params.ctx.customerName,
    issue: params.ctx.issue,
    window: params.ctx.window,
    ref: params.ref,
  });
}

async function notifyTech(
  userId: string,
  tech: TechMember,
  ctx: JobOfferContext,
  shopName: string,
): Promise<boolean> {
  const ref = bookingShortRef(ctx.bookingId);
  const body = techOfferSms({ shopName, ctx, ref });
  return sendTechSms({
    userId,
    techPhone: tech.phone,
    body,
    devLogLabel: "tech-dispatch-offer",
    operation: "tech_dispatch_offer",
    bookingId: ctx.bookingId,
  });
}

export async function startTechAssignmentForBooking(
  userId: string,
  bookingId: string,
): Promise<TechAssignment | null> {
  const settings = await getTechDispatchSettings(userId);
  if (!settings.enabled || !settings.assignOnApprove) return null;

  const ctx = await loadJobContext(userId, bookingId);
  if (!ctx) return null;

  let assignment = await getTechAssignment(userId, bookingId);
  if (assignment?.status === "accepted") return assignment;

  if (!assignment) {
    assignment = {
      bookingId,
      userId,
      status: "offering",
      assignedTechId: null,
      assignedTechName: null,
      currentTechId: null,
      offers: [],
      customerName: ctx.customerName,
      issue: ctx.issue,
      window: ctx.window,
      priority: ctx.priority,
      updatedAt: new Date().toISOString(),
    };
  }

  const declined = new Set(
    assignment.offers.filter((o) => o.outcome === "declined").map((o) => o.techId),
  );
  const pool = eligibleTechs(settings, ctx, declined);
  const tech = pickNextTech(pool, settings.lastAssignedTechId);

  if (!tech) {
    assignment.status = "declined_all";
    assignment.currentTechId = null;
    assignment.updatedAt = new Date().toISOString();
    await saveTechAssignment(assignment);
    return assignment;
  }

  const user = await findUserById(userId);
  const shopName = resolveShopDisplayName(user?.shopName);
  const sent = await notifyTech(userId, tech, ctx, shopName);

  if (!sent) {
    assignment.status = "unassigned";
    assignment.updatedAt = new Date().toISOString();
    await saveTechAssignment(assignment);
    return assignment;
  }

  assignment.status = "offering";
  assignment.currentTechId = tech.id;
  assignment.offers.push({
    techId: tech.id,
    techName: tech.name,
    outcome: "pending",
    offeredAt: new Date().toISOString(),
  });
  assignment.updatedAt = new Date().toISOString();
  await saveTechAssignment(assignment);
  await setTechPendingOffer(userId, tech.id, bookingId);
  await saveTechDispatchSettings(userId, { lastAssignedTechId: tech.id });
  return assignment;
}

export async function handleTechDispatchReply(params: {
  userId: string;
  fromPhone: string;
  body: string;
}): Promise<{ handled: boolean; replyBody: string }> {
  const trimmed = params.body.trim();
  const first = trimmed.split(/\s+/)[0]?.replace(/[^\d]/g, "") ?? "";
  if (first !== "1" && first !== "2") {
    return { handled: false, replyBody: "" };
  }

  const { findTechByPhone } = await import("./store");
  const tech = await findTechByPhone(params.userId, params.fromPhone);
  if (!tech) return { handled: false, replyBody: "" };

  const settings = await getTechDispatchSettings(params.userId);
  if (!settings.enabled) return { handled: false, replyBody: "" };

  const { parseOwnerReplyWithRef, bookingIdMatchesRef } = await import("../booking-ref");
  const parsed = parseOwnerReplyWithRef(trimmed);
  const accept = first === "1";

  let bookingId = await getTechPendingOffer(params.userId, tech.id);
  if (parsed.ref && bookingId && !bookingIdMatchesRef(bookingId, parsed.ref)) {
    return { handled: true, replyBody: "Effiroad: Ref does not match your open offer." };
  }

  if (!bookingId) {
    return { handled: true, replyBody: "Effiroad: No open job offer for you right now." };
  }

  const target = await getTechAssignment(params.userId, bookingId);
  if (!target || target.status !== "offering" || target.currentTechId !== tech.id) {
    return { handled: true, replyBody: "Effiroad: That offer already closed." };
  }

  const offer = target.offers.find((o) => o.techId === tech.id && o.outcome === "pending");
  if (!offer) {
    return { handled: true, replyBody: "Effiroad: That offer already closed." };
  }

  await clearTechPendingOffer(params.userId, tech.id);

  if (accept) {
    offer.outcome = "accepted";
    target.status = "accepted";
    target.assignedTechId = tech.id;
    target.assignedTechName = tech.name;
    target.currentTechId = null;
    target.updatedAt = new Date().toISOString();
    await saveTechAssignment(target);

    const note = `Assigned to ${tech.name} via Effiroad.`;
    if (target.bookingId.startsWith("call-")) {
      const callId = target.bookingId.slice("call-".length);
      const logs = await listCallLogs(params.userId);
      const call = logs.find((c) => c.id === callId);
      if (call) {
        const aiSummary = [call.aiSummary, note].filter(Boolean).join("\n");
        await patchCallLog(params.userId, callId, { aiSummary });
      }
    }

    const { promptTechOnMyWayAfterAccept } = await import("./on-my-way");
    await promptTechOnMyWayAfterAccept({
      userId: params.userId,
      techId: tech.id,
      techPhone: tech.phone,
      bookingId: target.bookingId,
      customerName: target.customerName,
    });

    const user = await findUserById(params.userId);
    const shop = resolveShopDisplayName(user?.shopName);
    const ref = bookingShortRef(target.bookingId);
    return {
      handled: true,
      replyBody: `${shop}: Accepted — ${target.customerName} (${ref}).`,
    };
  }

  offer.outcome = "declined";
  target.currentTechId = null;
  target.updatedAt = new Date().toISOString();
  await saveTechAssignment(target);

  const next = await startTechAssignmentForBooking(params.userId, target.bookingId);
  if (next?.status === "offering") {
    return { handled: true, replyBody: "Effiroad: Passed. Offering to the next tech." };
  }

  return {
    handled: true,
    replyBody: "Effiroad: Passed. Shop will assign manually.",
  };
}
