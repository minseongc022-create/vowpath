import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "./db";

/**
 * 공개 상태 페이지 + README 배지.
 *
 * ★ 왜 이게 유통 장치인가
 *
 * 고객이 자기 README에 배지를 붙이면, 그 저장소를 보는 모든 사람에게
 * "이 앱은 VibeSafe가 지켜보고 있다"가 노출된다. 광고비 0원으로 도는
 * 확산 고리다 — shields.io, Vercel, Netlify가 전부 이 방식으로 컸다.
 *
 * 동시에 고객에게도 값이 있다: 공개 상태 페이지는 "우리 서비스 잘 돌아갑니다"를
 * 남에게 증명하는 수단이다. 그래서 억지로 붙이는 홍보가 아니라 고객이
 * 원해서 붙이는 기능이 된다.
 *
 * ★ 공개 페이지에 나가는 것과 나가지 않는 것
 *
 * 나감: 흐름 이름, 정상/문제, 마지막 확인 시각, 무사고 일수
 * 절대 안 나감: 실제 주소, 저장소 이름, 오류 메시지, 스크린샷, 소유자
 *
 * 상태 페이지가 오히려 공격자에게 "이 앱의 로그인이 지금 깨져 있다"를
 * 알려주는 꼴이 되면 안 되므로, 실패한 흐름의 상세는 내보내지 않는다.
 */

export type PublicStatus = {
  projectName: string;
  state: "ok" | "down" | "unknown";
  headline: string;
  lastCheckedAt: Date | null;
  cleanDays: number;
  flows: { title: string; ok: boolean }[];
  watchingDays: number;
};

export async function enablePublicStatus(projectId: string): Promise<string> {
  const existing = await prisma.vibesafeProject.findUnique({
    where: { id: projectId },
    select: { publicSlug: true },
  });
  if (existing?.publicSlug) {
    await prisma.vibesafeProject.update({
      where: { id: projectId },
      data: { publicStatus: true },
    });
    return existing.publicSlug;
  }

  // 추측할 수 없는 slug — projectId를 그대로 쓰면 남의 페이지를 훑을 수 있다.
  const slug = randomBytes(9).toString("base64url");
  await prisma.vibesafeProject.update({
    where: { id: projectId },
    data: { publicSlug: slug, publicStatus: true },
  });
  return slug;
}

export async function disablePublicStatus(projectId: string): Promise<void> {
  await prisma.vibesafeProject.update({
    where: { id: projectId },
    data: { publicStatus: false },
  });
}

export async function getPublicStatus(slug: string): Promise<PublicStatus | null> {
  const project = await prisma.vibesafeProject.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      name: true,
      publicStatus: true,
      archivedAt: true,
      flows: {
        where: { status: "active" },
        select: { key: true, title: true },
        orderBy: { sortOrder: "asc" },
      },
      incidents: { where: { status: "open" }, select: { flowKey: true } },
    },
  });
  if (!project || !project.publicStatus || project.archivedAt) return null;

  const lastRun = await prisma.vibesafeTestRun.findFirst({
    where: { projectId: project.id, status: { in: ["passed", "failed"] } },
    orderBy: { queuedAt: "desc" },
    select: { id: true, finishedAt: true },
  });

  const results = lastRun
    ? await prisma.vibesafeTestResult.findMany({
        where: { runId: lastRun.id },
        select: { flowKey: true, status: true },
      })
    : [];
  const statusByKey = new Map(results.map((r) => [r.flowKey, r.status]));
  const openKeys = new Set(project.incidents.map((i) => i.flowKey));

  const flows = project.flows.map((f) => ({
    title: f.title,
    ok: !openKeys.has(f.key) && statusByKey.get(f.key) !== "failed",
  }));

  const firstRun = await prisma.vibesafeTestRun.findFirst({
    where: { projectId: project.id, status: { in: ["passed", "failed"] } },
    orderBy: { queuedAt: "asc" },
    select: { queuedAt: true },
  });

  // 무사고 일수: 마지막 장애 이후 며칠.
  const lastIncident = await prisma.vibesafeIncident.findFirst({
    where: { projectId: project.id },
    orderBy: { detectedAt: "desc" },
    select: { detectedAt: true, status: true },
  });

  const since = lastIncident?.detectedAt ?? firstRun?.queuedAt ?? null;
  const cleanDays =
    lastIncident?.status === "open" || !since
      ? 0
      : Math.floor((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000));

  const anyDown = flows.some((f) => !f.ok);
  const state: PublicStatus["state"] = !lastRun ? "unknown" : anyDown ? "down" : "ok";

  return {
    projectName: project.name,
    state,
    headline: state === "ok" ? "정상 작동 중" : state === "down" ? "일부 기능에 문제가 있습니다" : "확인 전",
    lastCheckedAt: lastRun?.finishedAt ?? null,
    cleanDays,
    flows,
    watchingDays: firstRun
      ? Math.max(1, Math.floor((Date.now() - firstRun.queuedAt.getTime()) / (24 * 60 * 60 * 1000)))
      : 0,
  };
}

/**
 * README 배지 SVG.
 *
 * shields.io를 쓰지 않고 직접 그리는 이유: 외부 서비스가 죽으면 고객의
 * README에 깨진 이미지가 뜬다. 상태를 알려주는 도구의 배지가 깨져 있는 것만큼
 * 나쁜 광고가 없다.
 */
export function renderBadgeSvg(params: { label: string; value: string; color: string }): string {
  const { label, value, color } = params;
  // 대략적인 글자 폭 — 한글은 넓고 영문은 좁다.
  const width = (text: string) =>
    [...text].reduce((n, ch) => n + (/[가-힣]/.test(ch) ? 11 : ch === " " ? 4 : 6.5), 0);

  const labelWidth = Math.ceil(width(label)) + 16;
  const valueWidth = Math.ceil(width(value)) + 16;
  const total = labelWidth + valueWidth;

  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <title>${esc(label)}: ${esc(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(label)}</text>
    <text x="${labelWidth / 2}" y="14">${esc(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${esc(value)}</text>
  </g>
</svg>`;
}

export function badgeForStatus(status: PublicStatus | null): { label: string; value: string; color: string } {
  if (!status) return { label: "VibeSafe", value: "연결 안 됨", color: "#9f9f9f" };
  if (status.state === "down") return { label: "VibeSafe", value: "문제 발견", color: "#e05d44" };
  if (status.state === "unknown") return { label: "VibeSafe", value: "확인 전", color: "#9f9f9f" };
  return {
    label: "VibeSafe",
    value: status.cleanDays > 0 ? `정상 ${status.cleanDays}일째` : "정상",
    color: "#4c1",
  };
}
