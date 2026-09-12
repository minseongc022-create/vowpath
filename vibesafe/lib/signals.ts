import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "./db";

/**
 * 교차 고객 이상탐지 — 고객이 1명인 경쟁사가 절대 못 만드는 신호.
 *
 * ★ 무엇을 할 수 있게 되는가
 *
 * "로그인이 깨졌습니다"와 "로그인이 깨졌는데, 같은 시각 다른 앱 12개에서도
 * 똑같은 증상입니다 — 당신 코드가 아니라 Supabase 쪽 문제로 보입니다"는
 * 완전히 다른 말이다. 후자는 사용자가 새벽에 자기 코드를 뒤지지 않게 해준다.
 *
 * 이건 고객이 많아야만 생기는 신호다. 오늘 똑같은 제품을 내놓는 경쟁사는
 * 고객이 1명이라 이 문장을 영원히 만들 수 없다.
 *
 * ★ 여기에 절대 남기지 않는 것
 *
 * 어느 프로젝트인지, 어느 주소인지, 누구인지. 남기는 건 "이런 모양의 실패가
 * 이 시각에 몇 건, 서로 다른 앱 몇 개에서 났다"뿐이다. 프로젝트 식별자가
 * 이 표에 들어가는 순간 이건 해자가 아니라 사고가 된다.
 */

/** 최소 이 정도 앱에서 동시에 나야 "우리 문제 아님"이라고 말한다. */
const PLATFORM_INCIDENT_MIN_PROJECTS = 3;

/**
 * 오류 메시지를 "모양"으로 정규화한다.
 *
 * 구체적인 값(시간, id, 주소, 숫자)을 지워서 같은 종류의 실패가 같은 지문을
 * 갖게 만든다. 이걸 안 하면 지문이 전부 달라 집계가 안 된다.
 */
export function normalizeFailure(params: {
  errorMessage: string | null;
  failedStepDescription: string | null;
}): { signature: string; category: string } {
  const raw = (params.errorMessage ?? params.failedStepDescription ?? "unknown").toLowerCase();

  const normalized = raw
    .replace(/https?:\/\/[^\s"')]+/g, "<url>")
    .replace(/\b[0-9a-f]{8,}\b/g, "<hash>")
    // ★ 단어 경계(\b)를 쓰면 안 된다 — "15000ms"의 숫자와 "ms" 사이에는
    //   경계가 없어서 매치가 안 되고, 그러면 "Timeout 15000ms"와
    //   "Timeout 30000ms"가 서로 다른 지문이 되어 집계가 통째로 깨진다.
    //   (테스트가 이걸 잡았다.)
    .replace(/\d+/g, "<n>")
    .replace(/"[^"]*"/g, "<str>")
    .replace(/'[^']*'/g, "<str>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

  const category = categorize(normalized);
  const signature = createHash("sha256").update(`${category}:${normalized}`).digest("hex").slice(0, 32);
  return { signature, category };
}

function categorize(normalized: string): string {
  if (/timeout|timed out|deadline/.test(normalized)) return "timeout";
  if (/not visible|waiting for|locator|element/.test(normalized)) return "element_missing";
  if (/net::|econnrefused|enotfound|dns|socket/.test(normalized)) return "network";
  if (/5\d\d|internal server error|500/.test(normalized)) return "server_error";
  if (/4\d\d|unauthorized|forbidden|401|403/.test(normalized)) return "auth_error";
  if (/supabase|postgres|database|relation .* does not exist/.test(normalized)) return "database";
  if (/주소|url/.test(normalized)) return "navigation";
  return "other";
}

function hourBucket(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()),
  );
}

/**
 * 실패 하나를 비식별 집계에 더한다.
 *
 * projectId를 인자로 받지만 **저장하지 않는다** — 같은 시간대 같은 지문에
 * 서로 다른 프로젝트가 몇 개인지만 세는 데 쓰고 버린다.
 */
export async function recordFailureSignature(params: {
  projectId: string;
  errorMessage: string | null;
  failedStepDescription: string | null;
}): Promise<void> {
  const { signature, category } = normalizeFailure(params);
  const bucket = hourBucket();

  try {
    const existing = await prisma.vibesafeFailureSignature.findUnique({
      where: { signature_hourBucket: { signature, hourBucket: bucket } },
      select: { id: true, count: true, projectSpread: true },
    });

    if (!existing) {
      await prisma.vibesafeFailureSignature.create({
        data: { signature, hourBucket: bucket, category, count: 1, projectSpread: 1 },
      });
      return;
    }

    // 이 시간대에 이 프로젝트가 이미 이 지문을 냈는지 — 원본 결과 표에서 센다.
    // (집계 표에는 프로젝트 정보를 안 남기므로 여기서만 확인하고 숫자만 올린다.)
    const alreadyFromThisProject = await hasProjectReportedSignature(params.projectId, signature, bucket);

    await prisma.vibesafeFailureSignature.update({
      where: { id: existing.id },
      data: {
        count: { increment: 1 },
        projectSpread: alreadyFromThisProject ? undefined : { increment: 1 },
      },
    });
  } catch (error) {
    // 집계 실패가 검사 결과 저장을 막지 않게 한다.
    console.error("[vibesafe] failure signature failed:", (error as Error).message);
  }
}

/** 이 프로젝트가 이번 시간대에 같은 지문을 이미 냈는지. */
async function hasProjectReportedSignature(
  projectId: string,
  signature: string,
  bucket: Date,
): Promise<boolean> {
  const bucketEnd = new Date(bucket.getTime() + 60 * 60 * 1000);
  const results = await prisma.vibesafeTestResult.findMany({
    where: {
      run: { projectId },
      status: "failed",
      finishedAt: { gte: bucket, lt: bucketEnd },
    },
    select: { errorMessage: true, failedStepDescription: true },
    take: 50,
  });
  // 방금 저장한 것 자신이 포함되므로 1건 초과일 때만 "이미 있었다"로 본다.
  const matches = results.filter(
    (r) =>
      normalizeFailure({
        errorMessage: r.errorMessage,
        failedStepDescription: r.failedStepDescription,
      }).signature === signature,
  );
  return matches.length > 1;
}

export type PlatformSignal = {
  isLikelyPlatformIssue: boolean;
  affectedProjects: number;
  category: string;
  message: string | null;
};

/**
 * "이거 우리만 그런가요, 다들 그런가요?"에 답한다.
 *
 * 사용자가 장애를 볼 때 제일 먼저 궁금해하는 것이고, 답을 아는 도구가
 * 지금까지 없었다.
 */
export async function checkPlatformSignal(params: {
  errorMessage: string | null;
  failedStepDescription: string | null;
}): Promise<PlatformSignal> {
  const { signature, category } = normalizeFailure(params);
  const bucket = hourBucket();
  const previousBucket = new Date(bucket.getTime() - 60 * 60 * 1000);

  const rows = await prisma.vibesafeFailureSignature.findMany({
    where: { signature, hourBucket: { in: [bucket, previousBucket] } },
    select: { projectSpread: true },
  });
  const affectedProjects = rows.reduce((max, r) => Math.max(max, r.projectSpread), 0);

  if (affectedProjects < PLATFORM_INCIDENT_MIN_PROJECTS) {
    return { isLikelyPlatformIssue: false, affectedProjects, category, message: null };
  }

  const hint =
    category === "database"
      ? "데이터베이스(Supabase 등) 쪽"
      : category === "network"
        ? "네트워크나 호스팅(Vercel 등) 쪽"
        : category === "server_error"
          ? "서버 또는 외부 서비스 쪽"
          : "공통 플랫폼 쪽";

  return {
    isLikelyPlatformIssue: true,
    affectedProjects,
    category,
    message:
      `지금 같은 증상이 다른 앱 ${affectedProjects}개에서도 동시에 나타나고 있습니다. ` +
      `당신 코드가 아니라 ${hint} 문제일 가능성이 높습니다 — 코드를 뒤지기 전에 해당 서비스 상태를 먼저 확인해보세요.`,
  };
}

/** 오래된 집계는 지운다. 보관할 이유가 없고, 오래 두면 표만 커진다. */
export async function pruneOldSignatures(days = 14): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.vibesafeFailureSignature.deleteMany({
    where: { hourBucket: { lt: cutoff } },
  });
  return result.count;
}
